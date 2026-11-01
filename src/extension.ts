import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(cp.exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Sync Activated');

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(sync) Git Sync";
    statusBarItem.tooltip = "Git Sync";
    statusBarItem.command = 'git-sync.showMenu';

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('gitSync');
        
        if (config.get<boolean>('enabled')) {
            statusBarItem.show();
            runAutoPull(rootPath);
        } else {
            statusBarItem.hide();
        }
    } else {
        statusBarItem.hide();
    }
    
    let menuDisposable = vscode.commands.registerCommand('git-sync.showMenu', async () => {
        if (!checkEnabledAndWorkspace()) return;

        const selection = await vscode.window.showQuickPick(
            [
                { label: 'Pull', description: 'Pull changes from remote' },
                { label: 'Push', description: 'Push changes to remote' }
            ],
            { placeHolder: 'Select an action' }
        );

        if (!selection) return;

        if (selection.label.includes('Pull')) {
            vscode.commands.executeCommand('git-sync.pull');
        } else if (selection.label.includes('Push')) {
            vscode.commands.executeCommand('git-sync.commitPush');
        }
    });

    let pullDisposable = vscode.commands.registerCommand('git-sync.pull', async () => {
        if (!checkEnabledAndWorkspace()) return;
        const rootPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
        
        try {
            statusBarItem.text = "$(sync~spin) Git Pull";
            vscode.window.showInformationMessage('Git Sync: Pull');
            await execAsync('git pull', { cwd: rootPath });
            vscode.window.showInformationMessage('Git Sync: Pull Ok');
        } catch (error: any) {
            vscode.window.showErrorMessage('Git Sync: Err: ' + error.message);
        } finally {
            statusBarItem.text = "$(sync) Git Sync";
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
            statusBarItem.text = "$(sync~spin) Git Sync";
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
        } finally {
            statusBarItem.text = "$(sync) Git Sync";
        }
    });

    context.subscriptions.push(statusBarItem, menuDisposable, pullDisposable, commitPushDisposable);
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