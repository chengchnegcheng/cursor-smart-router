import { ModelConfig } from '../types/models';

export const MODEL_CONFIG: ModelConfig = {
  'Claude3.7-Sonnet': {
    priority: 1,
    averageLatency: 15000,
    costPerToken: 0.0008,
    contextWindow: 200000,
    bestFor: [
      '复杂算法设计',
      '系统架构',
      '多文件重构',
      '深度代码分析'
    ]
  },
  'Gemini-2.5-Pro': {
    priority: 2,
    averageLatency: 8000,
    costPerToken: 0.0002,
    contextWindow: 128000,
    bestFor: [
      '代码补全',
      '简单重构',
      '文档生成',
      '语法检查',
      '单行注释'
    ],
    degradationRules: {
      maxLatency: 12000,
      minTokens: 50,
      maxTokens: 4000,
      preferredForTypes: [
        'completion',
        'documentation',
        'syntax',
        'rename'
      ]
    }
  },
  'Claude-3.5-Sonnet': {
    priority: 3,
    averageLatency: 5000,
    costPerToken: 0.0001,
    contextWindow: 100000,
    bestFor: [
      '代码补全',
      '简单修改',
      '文档注释',
      '基础查询'
    ]
  }
}; 