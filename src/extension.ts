import * as vscode from 'vscode';
import { UserStateDetector, UserState } from './core/detector';

let statusBarItem: vscode.StatusBarItem;
let userStateDetector: UserStateDetector;

async function tryGetLocalCursorToken(): Promise<string | undefined> {
    try {
        // 尝试从不同的可能位置获取Token
        const possiblePaths = [
            process.env.HOME + '/.cursor/config.json',
            process.env.HOME + '/Library/Application Support/cursor/config.json',
            process.env.APPDATA + '\\cursor\\config.json'
        ].filter(Boolean);

        for (const path of possiblePaths) {
            try {
                const fs = require('fs');
                const configContent = fs.readFileSync(path, 'utf8');
                const config = JSON.parse(configContent);
                if (config.token) {
                    return config.token;
                }
            } catch (e) {
                continue; // 继续尝试下一个路径
            }
        }
        return undefined;
    } catch (error) {
        console.error('获取本地Token失败:', error);
        return undefined;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Cursor智能路由插件已激活');

    // 初始化用户状态检测器
    userStateDetector = new UserStateDetector();

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursor-smart-router.showStatus';
    context.subscriptions.push(statusBarItem);

    // 尝试自动获取Token
    try {
        // 首先检查是否已经存储了Token
        let token = await context.secrets.get('cursorApiToken');
        
        // 如果没有存储的Token，尝试从本地配置获取
        if (!token) {
            token = await tryGetLocalCursorToken();
            if (token) {
                // 如果成功获取到本地Token，保存到安全存储
                await context.secrets.store('cursorApiToken', token);
                vscode.window.showInformationMessage('已自动配置Cursor API Token');
            }
        }

        if (token) {
            process.env.CURSOR_API_TOKEN = token;
        } else {
            // 如果没有找到token，提示用户设置
            const result = await vscode.window.showInformationMessage(
                '未能自动获取Cursor API Token，是否手动设置？',
                '现在设置',
                '稍后设置'
            );
            if (result === '现在设置') {
                await vscode.commands.executeCommand('cursor-smart-router.setApiToken');
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        vscode.window.showErrorMessage(`Token配置失败: ${errorMessage}`);
    }

    // 注册命令
    let disposable = vscode.commands.registerCommand('cursor-smart-router.showStatus', async () => {
        try {
            if (!process.env.CURSOR_API_TOKEN) {
                const result = await vscode.window.showInformationMessage(
                    '请先设置API Token以激活插件',
                    '现在设置',
                    '稍后设置'
                );
                if (result === '现在设置') {
                    await vscode.commands.executeCommand('cursor-smart-router.setApiToken');
                }
                return;
            }
            const userState = await userStateDetector.getUserState();
            showUserStatus(userState);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            vscode.window.showErrorMessage(`获取用户状态失败: ${errorMessage}`);
        }
    });

    context.subscriptions.push(disposable);

    // 注册设置API Token的命令
    let setTokenCommand = vscode.commands.registerCommand('cursor-smart-router.setApiToken', async () => {
        try {
            const token = await vscode.window.showInputBox({
                prompt: '请输入Cursor API Token',
                password: true,
                ignoreFocusOut: true, // 防止用户意外关闭输入框
                placeHolder: '在此输入您的API Token'
            });

            if (token) {
                await context.secrets.store('cursorApiToken', token);
                process.env.CURSOR_API_TOKEN = token;
                vscode.window.showInformationMessage('API Token设置成功！');
                await updateStatusBar();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            vscode.window.showErrorMessage(`设置API Token失败: ${errorMessage}`);
        }
    });

    context.subscriptions.push(setTokenCommand);

    // 定期更新状态栏
    setInterval(updateStatusBar, 60000); // 每分钟更新一次
    updateStatusBar(); // 初始更新
}

async function updateStatusBar() {
    try {
        if (!process.env.CURSOR_API_TOKEN) {
            statusBarItem.text = '$(warning) Cursor: 未激活';
            statusBarItem.tooltip = '点击设置API Token以激活插件';
            statusBarItem.command = 'cursor-smart-router.setApiToken'; // 直接跳转到设置Token
            statusBarItem.show();
            return;
        }

        const userState = await userStateDetector.getUserState();
        const icon = userState.isPro ? '$(star)' : '$(info)';
        const text = `${icon} Cursor: ${userState.fastRequestsRemaining}次`;
        statusBarItem.text = text;
        statusBarItem.tooltip = `Pro会员: ${userState.isPro ? '是' : '否'}\n剩余快速请求: ${userState.fastRequestsRemaining}`;
        statusBarItem.command = 'cursor-smart-router.showStatus'; // 恢复显示状态的命令
        statusBarItem.show();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        statusBarItem.text = '$(error) Cursor';
        statusBarItem.tooltip = `状态更新失败: ${errorMessage}`;
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