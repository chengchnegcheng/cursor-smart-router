import axios from 'axios';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { API_CONFIG } from '../config/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TokenInfo {
    token: string;
    expiresAt: number;
    source: string;
}

export class TokenManager {
    private static instance: TokenManager;
    private logger: Logger;
    private tokenInfo: TokenInfo | null = null;
    private refreshTimer: NodeJS.Timer | null = null;
    private readonly REFRESH_INTERVAL = 1000 * 60 * 30; // 30分钟
    private readonly TOKEN_ROTATION_COUNT = 3; // 轮换Token数量

    private constructor() {
        this.logger = new Logger();
    }

    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }

    // Token存储位置配置
    private getTokenStoragePaths(): string[] {
        const home = os.homedir();
        return [
            path.join(home, '.cursor', 'config.json'),
            path.join(home, 'Library', 'Application Support', 'cursor', 'config.json'),
            path.join(home, '.config', 'cursor', 'config.json'),
            process.env.APPDATA ? path.join(process.env.APPDATA, 'cursor', 'config.json') : '',
            path.join(home, '.cursor', 'tokens.json'),
            path.join(home, '.cursor-tokens')
        ].filter(Boolean);
    }

    // 验证Token有效性
    private async validateToken(token: string): Promise<boolean> {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER_STATUS}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.status === 200;
        } catch (error) {
            this.logger.error('Token验证失败', error);
            return false;
        }
    }

    // 从API获取新Token
    private async getNewTokenFromAPI(): Promise<string | undefined> {
        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/token`);
            return response.data.token;
        } catch (error) {
            this.logger.error('获取新Token失败', error);
            return undefined;
        }
    }

    // 保存Token到多个位置
    public async saveToken(token: string, source: string): Promise<void> {
        try {
            // 保存到VSCode安全存储
            const context = await this.getExtensionContext();
            if (context) {
                await context.secrets.store('cursorApiToken', token);
            }

            // 保存到本地文件
            const tokenData = {
                token,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
                source
            };

            const tokensPath = path.join(os.homedir(), '.cursor', 'tokens.json');
            const tokensDir = path.dirname(tokensPath);

            if (!fs.existsSync(tokensDir)) {
                fs.mkdirSync(tokensDir, { recursive: true });
            }

            // 读取现有的Token列表
            let tokens: TokenInfo[] = [];
            if (fs.existsSync(tokensPath)) {
                const content = fs.readFileSync(tokensPath, 'utf8');
                tokens = JSON.parse(content);
            }

            // 添加新Token并保持最多TOKEN_ROTATION_COUNT个Token
            tokens.unshift(tokenData);
            if (tokens.length > this.TOKEN_ROTATION_COUNT) {
                tokens = tokens.slice(0, this.TOKEN_ROTATION_COUNT);
            }

            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
            this.tokenInfo = tokenData;
        } catch (error) {
            this.logger.error('保存Token失败', error);
        }
    }

    // 从所有可能的位置获取Token
    public async getToken(): Promise<string | undefined> {
        try {
            // 如果当前Token仍然有效，直接返回
            if (this.tokenInfo && this.tokenInfo.expiresAt > Date.now()) {
                const isValid = await this.validateToken(this.tokenInfo.token);
                if (isValid) {
                    return this.tokenInfo.token;
                }
            }

            // 尝试从VSCode安全存储获取
            const context = await this.getExtensionContext();
            if (context) {
                const token = await context.secrets.get('cursorApiToken');
                if (token && await this.validateToken(token)) {
                    await this.saveToken(token, 'vscode');
                    return token;
                }
            }

            // 尝试从所有配置文件获取
            for (const path of this.getTokenStoragePaths()) {
                try {
                    if (fs.existsSync(path)) {
                        const content = fs.readFileSync(path, 'utf8');
                        const config = JSON.parse(content);
                        const token = config.token || config.tokens?.[0]?.token;
                        if (token && await this.validateToken(token)) {
                            await this.saveToken(token, path);
                            return token;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }

            // 尝试从环境变量获取
            const envToken = process.env.CURSOR_TOKEN || process.env.CURSOR_API_TOKEN;
            if (envToken && await this.validateToken(envToken)) {
                await this.saveToken(envToken, 'env');
                return envToken;
            }

            // 尝试从API获取新Token
            const newToken = await this.getNewTokenFromAPI();
            if (newToken) {
                await this.saveToken(newToken, 'api');
                return newToken;
            }

            return undefined;
        } catch (error) {
            this.logger.error('获取Token失败', error);
            return undefined;
        }
    }

    // 启动Token自动刷新
    public async startTokenRefresh(): Promise<void> {
        try {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }

            // 首次启动时立即检查Token
            const currentToken = await this.getToken();
            if (!currentToken) {
                this.logger.warn('未检测到有效Token，请先登录');
                return;
            }

            // 验证当前Token
            const isValid = await this.validateToken(currentToken);
            if (!isValid) {
                this.logger.warn('当前Token无效，尝试刷新');
                await this.rotateToken();
            }

            this.refreshTimer = setInterval(async () => {
                try {
                    // 检查当前Token是否即将过期
                    if (this.tokenInfo && this.tokenInfo.expiresAt - Date.now() < this.REFRESH_INTERVAL) {
                        this.logger.info('Token即将过期，开始刷新');
                        // 获取新Token
                        const newToken = await this.getNewTokenFromAPI();
                        if (newToken) {
                            await this.saveToken(newToken, 'refresh');
                            // 更新环境变量
                            process.env.CURSOR_API_TOKEN = newToken;
                            this.logger.info('Token刷新成功');
                        } else {
                            this.logger.error('获取新Token失败');
                        }
                    }
                } catch (error) {
                    this.logger.error('Token自动刷新失败', error);
                    // 如果刷新失败，尝试使用备用方法
                    try {
                        await this.rotateToken();
                    } catch (backupError) {
                        this.logger.error('备用Token刷新也失败', backupError);
                    }
                }
            }, this.REFRESH_INTERVAL);

            this.logger.info('Token自动刷新服务已启动');
        } catch (error) {
            this.logger.error('启动Token自动刷新服务失败', error);
            throw error;
        }
    }

    // 停止Token自动刷新
    public stopTokenRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // 实现Token轮换
    public async rotateToken(): Promise<string | undefined> {
        try {
            const tokensPath = path.join(os.homedir(), '.cursor', 'tokens.json');
            if (fs.existsSync(tokensPath)) {
                const content = fs.readFileSync(tokensPath, 'utf8');
                const tokens: TokenInfo[] = JSON.parse(content);

                // 验证并找到第一个有效的Token
                for (const tokenInfo of tokens) {
                    if (await this.validateToken(tokenInfo.token)) {
                        this.tokenInfo = tokenInfo;
                        return tokenInfo.token;
                    }
                }
            }

            // 如果没有有效的Token，获取新的
            return await this.getToken();
        } catch (error) {
            this.logger.error('Token轮换失败', error);
            return undefined;
        }
    }

    private async getExtensionContext(): Promise<vscode.ExtensionContext | undefined> {
        // 这里需要实现获取VSCode扩展上下文的逻辑
        // 可以通过全局变量或其他方式获取
        return (global as any).extensionContext;
    }
} 