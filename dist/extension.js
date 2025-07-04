"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const vscode = require("vscode");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const vscode__namespace = /* @__PURE__ */ _interopNamespaceDefault(vscode);
async function activate(context) {
  vscode__namespace.workspace.fs;
  let disposable = vscode__namespace.commands.registerCommand(
    "vscodeWebRolldown.bundle",
    async () => {
      const config = vscode__namespace.workspace.getConfiguration("vscodeWebRolldown");
      const configFilePathSetting = config.get("configFilePath");
      if (!configFilePathSetting) {
        vscode__namespace.window.showErrorMessage(
          'VSCode Web Rolldown: Configuration file path is not set in settings. Please configure "vscodeWebRolldown.configFilePath".'
        );
        return;
      }
      if (!vscode__namespace.workspace.workspaceFolders || vscode__namespace.workspace.workspaceFolders.length === 0) {
        vscode__namespace.window.showErrorMessage(
          "VSCode Web Rolldown: No workspace folder open. Please open a folder to use this extension."
        );
        return;
      }
      const workspaceRootUri = vscode__namespace.workspace.workspaceFolders[0].uri;
      vscode__namespace.Uri.joinPath(
        workspaceRootUri,
        configFilePathSetting
      );
    }
  );
  context.subscriptions.push(disposable);
}
function deactivate() {
}
exports.activate = activate;
exports.deactivate = deactivate;
