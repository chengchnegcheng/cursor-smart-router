import * as vscode from 'vscode';

// 创建状态栏项
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor智能路由插件已激活');

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(sync) 智能路由: Claude3.7";
    statusBarItem.tooltip = "点击切换模型";
    statusBarItem.command = 'cursor-smart-router.enable';
    statusBarItem.show();

    // 注册命令
    let disposable = vscode.commands.registerCommand('cursor-smart-router.enable', () => {
        vscode.window.showInformationMessage('智能路由已启用！');
        updateStatusBar('Claude-3.5-Sonnet'); // 更新状态栏显示
    });

    context.subscriptions.push(disposable, statusBarItem);
}

// 更新状态栏显示
function updateStatusBar(model: string) {
    let icon = '$(sync)';
    switch (model) {
        case 'Claude-3.5-Sonnet':
            icon = '$(rocket)'; // 快速模式
            break;
        case 'Claude3.7-Sonnet':
            icon = '$(star)'; // 高质量模式
            break;
        case 'Gemini-2.5-Pro':
            icon = '$(light-bulb)'; // 备选模式
            break;
    }
    statusBarItem.text = `${icon} 智能路由: ${model}`;
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}