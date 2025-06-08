import * as vscode from 'vscode';
import { UserStateDetector, UserState } from './core/detector';

let statusBarItem: vscode.StatusBarItem;
let userStateDetector: UserStateDetector;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Cursor智能路由插件已激活');

    // 初始化用户状态检测器
    userStateDetector = new UserStateDetector();

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursor-smart-router.showStatus';
    context.subscriptions.push(statusBarItem);

    // 注册命令
    let disposable = vscode.commands.registerCommand('cursor-smart-router.showStatus', async () => {
        try {
            const userState = await userStateDetector.getUserState();
            showUserStatus(userState);
        } catch (error) {
            vscode.window.showErrorMessage('获取用户状态失败');
        }
    });

    context.subscriptions.push(disposable);

    // 注册设置API Token的命令
    let setTokenCommand = vscode.commands.registerCommand('cursor-smart-router.setApiToken', async () => {
        const token = await vscode.window.showInputBox({
            prompt: '请输入Cursor API Token',
            password: true
        });

        if (token) {
            await context.secrets.store('cursorApiToken', token);
            process.env.CURSOR_API_TOKEN = token;
            vscode.window.showInformationMessage('API Token已更新');
            updateStatusBar();
        }
    });

    context.subscriptions.push(setTokenCommand);

    // 初始化时从密钥存储中获取token
    const token = await context.secrets.get('cursorApiToken');
    if (token) {
        process.env.CURSOR_API_TOKEN = token;
    }

    // 定期更新状态栏
    setInterval(updateStatusBar, 60000); // 每分钟更新一次
    updateStatusBar(); // 初始更新
}

async function updateStatusBar() {
    try {
        const userState = await userStateDetector.getUserState();
        const icon = userState.isPro ? '$(star)' : '$(info)';
        const text = `${icon} Cursor: ${userState.fastRequestsRemaining}次`;
        statusBarItem.text = text;
        statusBarItem.tooltip = `Pro会员: ${userState.isPro ? '是' : '否'}\n剩余快速请求: ${userState.fastRequestsRemaining}`;
        statusBarItem.show();
    } catch (error) {
        statusBarItem.text = '$(error) Cursor';
        statusBarItem.tooltip = '获取状态失败';
        statusBarItem.show();
    }
}

function showUserStatus(userState: UserState) {
    const statusMessage = 
        `Pro会员: ${userState.isPro ? '✓' : '✗'}\n` +
        `快速请求剩余: ${userState.fastRequestsRemaining}\n` +
        `总请求次数: ${userState.totalRequests}\n` +
        `可用模型: ${userState.modelAccess.join(', ')}`;

    vscode.window.showInformationMessage(statusMessage, { modal: true });
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}