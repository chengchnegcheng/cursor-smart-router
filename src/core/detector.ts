import { Logger } from '../utils/logger';
import NodeCache from 'node-cache';
import { apiClient, API_CONFIG } from '../config/api';

export interface UserState {
  isPro: boolean;
  fastRequestsRemaining: number;
  totalRequests: number;
  modelAccess: string[];
}

export class UserStateDetector {
  private logger: Logger;
  private cache: NodeCache;

  constructor() {
    this.logger = new Logger();
    this.cache = new NodeCache();
  }

  async getUserState(): Promise<UserState> {
    try {
      const cached = this.cache.get<UserState>('userState');
      if (cached !== undefined) {
        return cached;
      }

      const [statusResponse, usageResponse] = await Promise.all([
        apiClient.get(API_CONFIG.ENDPOINTS.USER_STATUS),
        apiClient.get(API_CONFIG.ENDPOINTS.USER_USAGE)
      ]);

      const userState: UserState = {
        isPro: statusResponse.data.tier === 'pro',
        fastRequestsRemaining: usageResponse.data.fastRequests.remaining,
        totalRequests: usageResponse.data.totalRequests,
        modelAccess: statusResponse.data.accessibleModels || []
      };
      
      this.cache.set('userState', userState, API_CONFIG.CACHE_TTL.USER_STATUS);
      return userState;
    } catch (error) {
      this.logger.error('获取用户状态失败', error);
      return {
        isPro: false,
        fastRequestsRemaining: 0,
        totalRequests: 0,
        modelAccess: []
      };
    }
  }

  async checkProMembership(): Promise<boolean> {
    try {
      const userState = await this.getUserState();
      return userState.isPro;
    } catch (error) {
      this.logger.error('检查Pro会员状态失败', error);
      return false;
    }
  }

  async getRemainingFastRequests(): Promise<number> {
    try {
      const userState = await this.getUserState();
      return userState.fastRequestsRemaining;
    } catch (error) {
      this.logger.error('获取快速请求次数失败', error);
      return 0;
    }
  }

  async hasModelAccess(model: string): Promise<boolean> {
    try {
      const userState = await this.getUserState();
      return userState.modelAccess.includes(model);
    } catch (error) {
      this.logger.error('检查模型访问权限失败', error);
      return false;
    }
  }
}