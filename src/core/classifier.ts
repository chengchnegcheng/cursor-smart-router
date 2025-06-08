import { Logger } from '../utils/logger';

export interface ClassificationResult {
  operationType: string;
  tokenCount: number;
  context: any;
}

export class OperationClassifier {
  private logger: Logger;
  private OPERATION_PATTERNS = {
    completion: [
      /补全.*函数/,
      /自动补全/,
      /代码提示/
    ],
    documentation: [
      /\/\/.*$/,
      /<summary>.*<\/summary>/,
      /注释|文档|解释/
    ],
    syntax: [
      /格式化/,
      /语法检查/,
      /修复.*错误/
    ],
    rename: [
      /重命名/,
      /变量名/,
      /函数名/
    ],
    refactor: [
      /重构/,
      /优化.*代码/,
      /改进.*结构/
    ],
    analysis: [
      /分析/,
      /诊断/,
      /调试/
    ]
  };

  constructor() {
    this.logger = new Logger();
  }

  async classify(request: any): Promise<ClassificationResult> {
    try {
      const operationType = this.detectOperationType(request);
      const tokenCount = this.estimateTokenCount(request);

      this.logger.info(`操作分类: ${operationType}, Token数: ${tokenCount}`);

      return {
        operationType,
        tokenCount,
        context: request.codeContext
      };
    } catch (error) {
      this.logger.error('操作分类失败', error);
      return {
        operationType: 'unknown',
        tokenCount: 0,
        context: request.codeContext
      };
    }
  }

  private detectOperationType(request: any): string {
    const content = request.codeSnippet || request.prompt || '';
    
    for (const [type, patterns] of Object.entries(this.OPERATION_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return type;
      }
    }

    // 默认为completion类型
    return 'completion';
  }

  private estimateTokenCount(request: any): number {
    const content = request.codeSnippet || request.prompt || '';
    // 简单估算：按空格分词，每个中文字符算一个token
    const words = content.split(/\s+/);
    const chineseChars = content.match(/[\u4e00-\u9fa5]/g) || [];
    return words.length + chineseChars.length;
  }
}