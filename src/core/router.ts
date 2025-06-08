import { UserStateDetector } from './detector';
import { OperationClassifier } from './classifier';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';

export class SmartRouter {
  private models = {
    fast: 'claude-3.5',
    slow: {
      'claude3.7-sonnet': 15000, // 平均响应时间(ms)
      'gemini-2.5-pro': 12000
    }
  };

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

      if (await detector.getRemainingFastRequests() > 0) {
        this.logger.info('有快速请求次数，保持原路由');
        return request.model;
      }

      const { isCritical } = classifier.classify(request);
      
      const selectedModel = isCritical 
        ? request.model 
        : this.models.fast;

      this.metrics.recordRouting({
        originalModel: request.model,
        selectedModel,
        isCritical
      });

      this.logger.info(`路由决策: ${selectedModel} (关键操作: ${isCritical})`);
      return selectedModel;
    } catch (error) {
      this.logger.error('路由决策失败', error);
      return request.model; // 失败时保持原路由
    }
  }

  async checkModelLatency(models: string[]): Promise<string> {
    const latencies = await this.metrics.getModelLatencies(models);
    return models.reduce((fastest, current) => {
      return latencies[current] < latencies[fastest] ? current : fastest;
    });
  }
}