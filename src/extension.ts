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
    logger = new Logger();
    logger.info('Cursor智能路由插件已激活');

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

    // 启动Token自动刷新
    tokenManager.startTokenRefresh();

    // 注册命令
    let disposables = [
        vscode.commands.registerCommand('cursor-smart-router.refreshToken', async () => {
            try {
                const token = await tokenManager.rotateToken();
                if (token) {
                    vscode.window.showInformationMessage('Token已成功刷新');
                } else {
                    vscode.window.showErrorMessage('Token刷新失败');
                }
            } catch (error) {
                logger.error('Token刷新失败', error);
            }
        }),

        vscode.commands.registerCommand('cursor-smart-router.webLogin', async () => {
            try {
                await authManager.openWebLogin();
            } catch (error) {
                logger.error('打开网页登录失败', error);
            }
        }),

        vscode.commands.registerCommand('cursor-smart-router.openAccountManager', async () => {
            try {
                await authManager.openAccountManager();
            } catch (error) {
                logger.error('打开账户管理失败', error);
            }
        })
    ];

    context.subscriptions.push(...disposables);

    // 定期检查Token状态
    setInterval(async () => {
        try {
            const token = await tokenManager.getToken();
            if (!token) {
                statusBarItem.text = '$(alert) Cursor Token无效';
                statusBarItem.tooltip = '点击登录或刷新Token';
                statusBarItem.command = 'cursor-smart-router.webLogin';
            } else {
                statusBarItem.text = '$(check) Cursor已连接';
                statusBarItem.tooltip = 'Cursor Token有效';
            }
            statusBarItem.show();
        } catch (error) {
            logger.error('检查Token状态失败', error);
        }
    }, 1000 * 60); // 每分钟检查一次
}

export function deactivate() {
    if (tokenManager) {
        tokenManager.stopTokenRefresh();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}