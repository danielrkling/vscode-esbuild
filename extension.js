

const vscode = require("vscode");


/**
 *
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function (context) {
  const fs = vscode.workspace.fs;
  let disposable = vscode.commands.registerCommand(
    "vscodeWebRolldown.bundle",
    async () => {
      const config = vscode.workspace.getConfiguration("vscodeWebRolldown");
      const configFilePathSetting = config.get("configFilePath");

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

      const rollup = import("https://unpkg.com/@rollup/browser/dist/es/rollup.browser.js")
      console.log(rollup)

      rollup
        .rollup({
          input: configUri,
          fs: fs,
        })
        .then((bundle) => bundle.generate({ format: "es" }))
        .then(({ output }) => console.log(output[0].code));

      vscode.window.showInformationMessage(
        `Attempting to read config from: ${configUri.fsPath}`
      );

      const fileContent = await fs.readFile(configUri);

      vscode.window.showInformationMessage(
        `Successfully read config file. Content length: ${fileContent.length} characters.`
      );
      console.log("Rolldown Config Content:", fileContent); // Log to VS Code's Debug Console

      // 5. Example: Write a file (as in original code)
      //    fs.writeFile expects Uint8Array or Buffer.
      const mainJsUri = vscode.Uri.joinPath(workspaceRootUri, "main.js");
      await fs.writeFile(mainJsUri, fileContent);

      vscode.window.showInformationMessage(
        "VSCode Web Rolldown: Bundling complete. Check main.js!"
      );
    }
  );

  context.subscriptions.push(disposable);
};

// this method is called when your extension is deactivated
exports.deactivate = function () {};
