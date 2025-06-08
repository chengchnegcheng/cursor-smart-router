import axios from 'axios';

// API配置
export const API_CONFIG = {
  BASE_URL: 'https://api.cursor.sh/v1',
  ENDPOINTS: {
    USER_STATUS: '/user/status',
    USER_USAGE: '/user/usage',
    MODEL_STATUS: '/models/status'
  },
  CACHE_TTL: {
    USER_STATUS: 300, // 5分钟
    USER_USAGE: 60,   // 1分钟
    MODEL_STATUS: 120 // 2分钟
  }
};

// 创建axios实例
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从VSCode扩展上下文获取token
    const token = process.env.CURSOR_API_TOKEN || '';
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          throw new Error('未授权，请检查API Token');
        case 403:
          throw new Error('无访问权限');
        case 429:
          throw new Error('请求次数超限');
        default:
          throw new Error(`请求失败: ${error.response.status}`);
      }
    }
    throw error;
  }
); 