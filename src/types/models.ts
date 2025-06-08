export interface ModelConfig {
  [key: string]: {
    priority: number;
    averageLatency: number;
    costPerToken: number;
    contextWindow: number;
    bestFor: string[];
    degradationRules?: {
      maxLatency: number;
      minTokens: number;
      maxTokens: number;
      preferredForTypes: string[];
    };
  };
} 