import * as vscode from 'vscode';
import axios from 'axios';
import { Logger } from '../utils/logger';
import { TokenManager } from './token-manager';

export class AuthManager {
    private static instance: AuthManager;
    private logger: Logger;
    private tokenManager: TokenManager;

    private constructor() {
        this.logger = new Logger();
        this.tokenManager = TokenManager.getInstance();
    }

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    // 打开Cursor网页登录
    public async openWebLogin(): Promise<void> {
        try {
            // 创建并显示登录网页视图
            const panel = vscode.window.createWebviewPanel(
                'cursorLogin',
                'Cursor登录',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // 设置网页内容
            panel.webview.html = this.getWebviewContent();

            // 处理网页消息
            panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'login':
                        await this.handleLogin(message.token);
                        panel.dispose();
                        break;
                    case 'error':
                        this.logger.error('登录失败', message.error);
                        break;
                }
            });

            // 监听网页关闭
            panel.onDidDispose(() => {
                this.logger.info('登录窗口已关闭');
            });
        } catch (error) {
            this.logger.error('打开登录窗口失败', error);
        }
    }

    // 处理登录成功
    private async handleLogin(token: string): Promise<void> {
        try {
            if (token) {
                await this.tokenManager.saveToken(token, 'web_login');
                vscode.window.showInformationMessage('Cursor登录成功！');
            }
        } catch (error) {
            this.logger.error('处理登录失败', error);
        }
    }

    // 生成登录页面HTML
    private getWebviewContent(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cursor登录</title>
                <style>
                    body {
                        padding: 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        text-align: center;
                    }
                    .button {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #007acc;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        margin: 10px;
                        cursor: pointer;
                    }
                    .button:hover {
                        background-color: #005999;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Cursor登录</h1>
                    <p>请选择登录方式：</p>
                    <div>
                        <a class="button" href="https://www.cursor.com/dashboard" target="_blank">
                            打开Cursor仪表盘
                        </a>
                    </div>
                    <div>
                        <a class="button" onclick="openAccountManager()">
                            打开账户管理
                        </a>
                    </div>
                    <p>登录成功后，请复制Token并粘贴到下方：</p>
                    <div>
                        <input type="password" id="tokenInput" placeholder="粘贴Token" style="width: 300px; padding: 5px;">
                        <button onclick="submitToken()" class="button">提交</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    function openAccountManager() {
                        vscode.postMessage({
                            command: 'openAccountManager'
                        });
                    }

                    function submitToken() {
                        const token = document.getElementById('tokenInput').value;
                        if (token) {
                            vscode.postMessage({
                                command: 'login',
                                token: token
                            });
                        } else {
                            vscode.postMessage({
                                command: 'error',
                                error: 'Token不能为空'
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    // 打开账户管理
    public async openAccountManager(): Promise<void> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse('vscode://cursor.cursor/account'));
        } catch (error) {
            this.logger.error('打开账户管理失败', error);
            // 如果VSCode命令失败，尝试打开网页版
            await vscode.env.openExternal(vscode.Uri.parse('https://www.cursor.com/dashboard'));
        }
    }
} 