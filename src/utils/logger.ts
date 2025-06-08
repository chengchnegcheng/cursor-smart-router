import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Cursor Smart Router');
  }

  public info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  public error(message: string, error?: any): void {
    this.log('ERROR', message, error);
    if (error && error.message) {
      vscode.window.showErrorMessage(`${message}: ${error.message}`);
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  public warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      args.forEach((arg) => {
        if (arg instanceof Error) {
          logMessage += `\n${arg.stack || arg.message}`;
        } else if (typeof arg === 'object') {
          try {
            logMessage += `\n${JSON.stringify(arg, null, 2)}`;
          } catch (e) {
            logMessage += `\n${arg}`;
          }
        } else {
          logMessage += `\n${arg}`;
        }
      });
    }

    this.outputChannel.appendLine(logMessage);
  }
}