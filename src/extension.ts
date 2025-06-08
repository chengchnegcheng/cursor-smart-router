import * as vscode from 'vscode';
import { UserStateDetector, UserState } from './core/detector';
import { TokenManager } from './core/token-manager';
import { AuthManager } from './core/auth-manager';
import { Logger } from './utils/logger';

let userStateDetector: UserStateDetector;
let statusBarItem: vscode.StatusBarItem;
let tokenManager: TokenManager;
let authManager: AuthManager;
let logger: Logger;

// 设置全局扩展上下文
function setExtensionContext(context: vscode.ExtensionContext) {
    (global as any).extensionContext = context;
}

export async function activate(context: vscode.ExtensionContext) {
    try {
        logger = new Logger();
        logger.info('正在激活Cursor智能路由插件...');

        // 设置全局扩展上下文
        setExtensionContext(context);

        // 初始化管理器
        tokenManager = TokenManager.getInstance();
        authManager = AuthManager.getInstance();
        
        // 初始化用户状态检测器
        userStateDetector = new UserStateDetector();

        // 创建状态栏项
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        context.subscriptions.push(statusBarItem);

        // 初始状态显示
        statusBarItem.text = '$(sync~spin) Cursor正在初始化...';
        statusBarItem.tooltip = '正在检查Token状态';
        statusBarItem.show();

        // 启动Token自动刷新
        await tokenManager.startTokenRefresh();

        // 注册命令
        let disposables = [
            vscode.commands.registerCommand('cursor-smart-router.refreshToken', async () => {
                try {
                    statusBarItem.text = '$(sync~spin) 正在刷新Token...';
                    const token = await tokenManager.rotateToken();
                    if (token) {
                        vscode.window.showInformationMessage('Token已成功刷新');
                        updateStatusBar(true);
                    } else {
                        vscode.window.showErrorMessage('Token刷新失败');
                        updateStatusBar(false);
                    }
                } catch (error) {
                    logger.error('Token刷新失败', error);
                    updateStatusBar(false);
                }
            }),

            vscode.commands.registerCommand('cursor-smart-router.webLogin', async () => {
                try {
                    await authManager.openWebLogin();
                } catch (error) {
                    logger.error('打开网页登录失败', error);
                    vscode.window.showErrorMessage('打开网页登录失败');
                }
            }),

            vscode.commands.registerCommand('cursor-smart-router.openAccountManager', async () => {
                try {
                    await authManager.openAccountManager();
                } catch (error) {
                    logger.error('打开账户管理失败', error);
                    vscode.window.showErrorMessage('打开账户管理失败');
                }
            })
        ];

        context.subscriptions.push(...disposables);

        // 更新状态栏函数
        async function updateStatusBar(forceCheck: boolean = false) {
            try {
                const token = await tokenManager.getToken();
                const userState = await userStateDetector.getUserState();
                
                if (!token) {
                    statusBarItem.text = '$(alert) Cursor未激活';
                    statusBarItem.tooltip = '点击登录或刷新Token';
                    statusBarItem.command = 'cursor-smart-router.webLogin';
                } else if (!userState.isPro) {
                    statusBarItem.text = '$(info) Cursor基础版';
                    statusBarItem.tooltip = '升级到Pro版以启用智能路由';
                    statusBarItem.command = 'cursor-smart-router.openAccountManager';
                } else {
                    statusBarItem.text = '$(check) Cursor Pro已激活';
                    statusBarItem.tooltip = `快速请求剩余: ${userState.fastRequestsRemaining}`;
                }
                statusBarItem.show();
            } catch (error) {
                logger.error('更新状态栏失败', error);
                statusBarItem.text = '$(warning) Cursor状态异常';
                statusBarItem.tooltip = '点击重试';
                statusBarItem.command = 'cursor-smart-router.refreshToken';
                statusBarItem.show();
            }
        }

        // 首次更新状态栏
        await updateStatusBar(true);

        // 定期检查状态
        setInterval(() => updateStatusBar(), 60000); // 每分钟更新一次

        logger.info('Cursor智能路由插件激活成功');
        vscode.window.showInformationMessage('Cursor智能路由插件已激活');
        
    } catch (error) {
        logger.error('插件激活失败', error);
        vscode.window.showErrorMessage('Cursor智能路由插件激活失败');
        throw error;
    }
}

export function deactivate() {
    if (tokenManager) {
        tokenManager.stopTokenRefresh();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    logger.info('Cursor智能路由插件已停用');
}