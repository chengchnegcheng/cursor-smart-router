import { Logger } from './logger';

export class MetricsCollector {
  private logger: Logger;
  private latencyData: Map<string, number[]>;
  private readonly MAX_SAMPLES = 100;

  constructor() {
    this.logger = new Logger();
    this.latencyData = new Map();
  }

  recordLatency(model: string, latency: number): void {
    if (!this.latencyData.has(model)) {
      this.latencyData.set(model, []);
    }

    const samples = this.latencyData.get(model)!;
    samples.push(latency);

    if (samples.length > this.MAX_SAMPLES) {
      samples.shift();
    }

    this.logger.info(`记录延迟: ${model} = ${latency}ms`);
  }

  async getModelLatencies(models: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    for (const model of models) {
      const samples = this.latencyData.get(model) || [];
      if (samples.length > 0) {
        result[model] = samples.reduce((a, b) => a + b) / samples.length;
      } else {
        result[model] = Infinity;
      }
    }

    return result;
  }

  recordRouting(data: {
    originalModel: string;
    selectedModel: string;
    isCritical: boolean;
  }): void {
    this.logger.info('路由记录', data);
    // TODO: 实现指标收集和分析
  }
}