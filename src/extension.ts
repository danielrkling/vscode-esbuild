import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const fs = vscode.workspace.fs;


  let disposable = vscode.commands.registerCommand(
    "vscodeWebRolldown.bundle",
    async () => {
      const config = vscode.workspace.getConfiguration("vscodeWebRolldown");
      const configFilePathSetting = config.get("configFilePath") as string;

      if (!configFilePathSetting) {
        vscode.window.showErrorMessage(
          'VSCode Web Rolldown: Configuration file path is not set in settings. Please configure "vscodeWebRolldown.configFilePath".'
        );
        return;
      }

      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showErrorMessage(
          "VSCode Web Rolldown: No workspace folder open. Please open a folder to use this extension."
        );
        return;
      }

      const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
      const configUri = vscode.Uri.joinPath(
        workspaceRootUri,
        configFilePathSetting
      );


      
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
