import { Logger } from '../utils/logger';

export class OperationClassifier {
  private logger: Logger;
  private NON_CRITICAL_PATTERNS = [
    /\/\/.*$/,              // 单行注释
    /^[\w\s]+\s*=\s*.*$/,    // 变量赋值
    /\.(?:log|info|debug)/,  // 日志语句
    /import\s+[\w{},\s]+/,   // 导入语句
    /<summary>.*<\/summary>/, // 文档摘要
    /注释|文档|补全|解释|格式化/  // 中文关键词
  ];

  constructor() {
    this.logger = new Logger();
  }

  classify(request: any): { isCritical: boolean; context: any } {
    try {
      const isNonCritical = this.NON_CRITICAL_PATTERNS.some(pattern => 
        pattern.test(request.codeSnippet)
      );

      this.logger.info(`操作分类结果: ${isNonCritical ? '非关键' : '关键'}`);

      return {
        isCritical: !isNonCritical,
        context: request.codeContext
      };
    } catch (error) {
      this.logger.error('操作分类失败', error);
      return {
        isCritical: true, // 分类失败时当作关键操作处理
        context: request.codeContext
      };
    }
  }
}