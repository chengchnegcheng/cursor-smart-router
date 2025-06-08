import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    // 开发环境下同时输出到控制台
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(`[Cursor-Router] ℹ️ ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    this.logger.error(`[Cursor-Router] ❌ ${message}`, error);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(`[Cursor-Router] ⚠️ ${message}`, ...args);
  }

  success(message: string, ...args: any[]): void {
    this.logger.info(`[Cursor-Router] ✅ ${message}`, ...args);
  }
}