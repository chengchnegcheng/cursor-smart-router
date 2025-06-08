import { SmartRouter } from './core/router';
import { Logger } from './utils/logger';
import axios from 'axios';
import { EventEmitter } from 'events';

export class CursorSmartRouterPlugin extends EventEmitter {
  private router: SmartRouter;
  private logger: Logger;

  constructor() {
    super();
    this.router = new SmartRouter();
    this.logger = new Logger();
  }

  async activate() {
    this.logger.info('Cursor智能路由插件已激活');

    // 使用事件监听替代直接API调用
    this.on('request', async (request: any) => {
      try {
        const routedModel = await this.router.routeRequest(request);
        
        if (routedModel !== request.model) {
          this.emit('notification', {
            type: 'info',
            message: `🚀 已切换至${routedModel}加速模式`,
            duration: 3000
          });
        }

        this.emit('response', {
          ...request,
          model: routedModel
        });
      } catch (error) {
        this.logger.error('请求处理失败', error);
        this.emit('response', request);
      }
    });
  }

  async handleRequest(request: any) {
    return new Promise((resolve) => {
      this.once('response', resolve);
      this.emit('request', request);
    });
  }

  deactivate() {
    this.logger.info('Cursor智能路由插件已停用');
    this.removeAllListeners();
  }
}