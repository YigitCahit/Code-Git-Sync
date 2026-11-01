import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(cp.exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Sync Activated');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('gitSync');
        
        if (config.get<boolean>('enabled')) {
            runAutoPull(rootPath);
        }
    }

    let pullDisposable = vscode.commands.registerCommand('git-sync.pull', async () => {
        if (!checkEnabledAndWorkspace()) return;
        const rootPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
        
        try {
            vscode.window.showInformationMessage('Git Sync: Pull');
            await execAsync('git pull', { cwd: rootPath });
            vscode.window.showInformationMessage('Git Sync: Pull Ok');
        } catch (error: any) {
            vscode.window.showErrorMessage('Git Sync: Err: ' + error.message);
        }
    });

    let commitPushDisposable = vscode.commands.registerCommand('git-sync.commitPush', async () => {
        if (!checkEnabledAndWorkspace()) return;
        const rootPath = vscode.workspace.workspaceFolders![0].uri.fsPath;

        const customMessage = await vscode.window.showInputBox({
            prompt: 'Commit Message',
            placeHolder: 'Default: date/time stamp'
        });

        if (customMessage === undefined) return;

        try {
            vscode.window.showInformationMessage('Git Sync: Add');
            await execAsync('git add .', { cwd: rootPath });

            const message = customMessage.trim() !== '' 
                ? customMessage 
                : `Otomatik Sync: ${new Date().toLocaleString('tr-TR')}`;

            vscode.window.showInformationMessage('Git Sync: Commit');
            await execAsync(`git commit -m "${message}"`, { cwd: rootPath });

            vscode.window.showInformationMessage('Git Sync: Push');
            await execAsync('git push', { cwd: rootPath });

            vscode.window.showInformationMessage('Git Sync: Push Ok');
        } catch (error: any) {
            vscode.window.showErrorMessage('Git Sync: Err: ' + error.message);
        }
    });

    context.subscriptions.push(pullDisposable, commitPushDisposable);
}

function checkEnabledAndWorkspace(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('There is no workspace folder open. Please open a folder to use Git Sync.');
        return false;
    }

    const config = vscode.workspace.getConfiguration('gitSync');
    if (!config.get<boolean>('enabled')) {
        vscode.window.showWarningMessage('This workspace does not have Git Sync enabled. Please enable it in settings to use this command.');
        return false;
    }

    return true;
}

async function runAutoPull(rootPath: string) {
    try {
        await execAsync('git pull', { cwd: rootPath });
        vscode.window.setStatusBarMessage('Git Sync: Pull Ok', 4000);
    } catch (error: any) {
        vscode.window.showErrorMessage('Git Sync: Err: ' + error.message);
    }
}

export function deactivate() {}