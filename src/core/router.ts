import { UserStateDetector } from './detector';
import { OperationClassifier } from './classifier';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { MODEL_CONFIG } from '../config/models';

export class SmartRouter {
  private logger: Logger;
  private metrics: MetricsCollector;

  constructor() {
    this.logger = new Logger();
    this.metrics = new MetricsCollector();
  }

  async routeRequest(request: any) {
    const detector = new UserStateDetector();
    const classifier = new OperationClassifier();
    
    try {
      if (!await detector.checkProMembership()) {
        this.logger.info('非Pro用户，保持原路由');
        return request.model;
      }

      const { operationType, tokenCount } = await classifier.classify(request);
      const modelLatencies = await this.metrics.getModelLatencies(Object.keys(MODEL_CONFIG));
      
      // 选择最适合的模型
      const selectedModel = this.selectBestModel({
        operationType,
        tokenCount,
        currentLatencies: modelLatencies,
        originalModel: request.model
      });

      this.metrics.recordRouting({
        originalModel: request.model,
        selectedModel,
        operationType
      });

      this.logger.info(`路由决策: ${selectedModel} (操作类型: ${operationType})`);
      return selectedModel;
    } catch (error) {
      this.logger.error('路由决策失败', error);
      return request.model;
    }
  }

  private selectBestModel(params: {
    operationType: string;
    tokenCount: number;
    currentLatencies: Record<string, number>;
    originalModel: string;
  }): string {
    const { operationType, tokenCount, currentLatencies, originalModel } = params;

    // 按优先级排序的模型列表
    const modelsByPriority = Object.entries(MODEL_CONFIG)
      .sort(([, a], [, b]) => a.priority - b.priority);

    for (const [modelName, config] of modelsByPriority) {
      // 检查是否适合当前操作类型
      if (config.degradationRules?.preferredForTypes.includes(operationType)) {
        // 检查token数量是否在范围内
        if (config.degradationRules.minTokens <= tokenCount && 
            tokenCount <= config.degradationRules.maxTokens) {
          // 检查当前延迟是否可接受
          if (currentLatencies[modelName] <= config.degradationRules.maxLatency) {
            return modelName;
          }
        }
      }
    }

    // 如果没有找到合适的模型，返回原始模型
    return originalModel;
  }

  async checkModelLatency(models: string[]): Promise<string> {
    const latencies = await this.metrics.getModelLatencies(models);
    return models.reduce((fastest, current) => {
      return latencies[current] < latencies[fastest] ? current : fastest;
    });
  }
}