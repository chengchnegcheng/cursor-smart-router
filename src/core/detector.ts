import { Logger } from '../utils/logger';
import NodeCache from 'node-cache';
import axios from 'axios';

export class UserStateDetector {
  private logger: Logger;
  private cache: NodeCache;
  private readonly CACHE_TTL = 300; // 5分钟缓存（秒）

  constructor() {
    this.logger = new Logger();
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
  }

  async checkProMembership(): Promise<boolean> {
    try {
      const cached = this.cache.get<boolean>('proStatus');
      if (cached !== undefined) {
        return cached;
      }

      // 模拟API调用
      const response = await axios.get('/api/user/status');
      const isPro = response.data.tier === 'pro';
      
      this.cache.set('proStatus', isPro);
      return isPro;
    } catch (error) {
      this.logger.error('检查Pro会员状态失败', error);
      return false;
    }
  }

  async getRemainingFastRequests(): Promise<number> {
    try {
      const cached = this.cache.get<number>('fastRequests');
      if (cached !== undefined) {
        return cached;
      }

      // 模拟API调用
      const response = await axios.get('/api/user/usage');
      const remaining = response.data.fastRequests.remaining;
      
      this.cache.set('fastRequests', remaining);
      return remaining;
    } catch (error) {
      this.logger.error('获取快速请求次数失败', error);
      return 0;
    }
  }
}