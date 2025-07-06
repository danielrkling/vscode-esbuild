import {
  commands,
  ExtensionContext,
  window,
  workspace,
  Uri,
  OutputChannel,
  FileSystemWatcher,
} from "vscode";
import { initialize, build } from "esbuild-wasm";
import { fsPlugin } from "./fs-plugin";
import { httpPlugin } from "./http-plugin";

let initialized = false;
let outputWindow: OutputChannel;
let watcher: FileSystemWatcher | undefined;

export async function activate(context: ExtensionContext) {
  if (!initialized) {
    await initialize({
      worker: true,
      wasmURL: "https://unpkg.com/esbuild-wasm/esbuild.wasm",
    });
    initialized = true;
    outputWindow = window.createOutputChannel("esbuild");
    outputWindow.show();
  }

  commands.registerCommand("vscode-web-esbuild.build", buildConfig);

  commands.registerCommand("vscode-web-esbuild.watch", async () => {
    if (watcher) {
      watcher.dispose();
      watcher = undefined;
    }
    const glob: string = workspace
      .getConfiguration("vscode-web-esbuild")
      .get("glob")!;
    watcher = workspace.createFileSystemWatcher(glob);

    watcher.onDidChange(buildConfig);
    watcher.onDidCreate(buildConfig);
    watcher.onDidDelete(buildConfig);
    outputWindow.appendLine(`Starting file watcher for ${glob}`);
    buildConfig()
  });

  commands.registerCommand("vscode-web-esbuild.unwatch", async () => {
    if (watcher) {
      watcher.dispose();
      watcher = undefined;
      outputWindow.appendLine("Stopped watching files.");
    } else {
      outputWindow.appendLine("No watcher is currently active.");
    }
  });
}

async function getConfig() {
  try {
    const configPath: string =
      workspace.getConfiguration("vscode-web-esbuild").get("configPath") ||
      "esbuild.config.json";
    outputWindow.appendLine(`Reading config file: ${configPath.toString()}`);
    const buffer = await workspace.fs.readFile(
      Uri.joinPath(workspace.workspaceFolders![0].uri, configPath)
    );
    const configContents = await workspace.decode(buffer);
    const config = JSON.parse(configContents);
    return config;
  } catch (error) {
    outputWindow.appendLine(
      `Error reading config file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function buildConfig() {
  try {
    if (!workspace.workspaceFolders) {
      outputWindow.appendLine("No workspace folders found.");
      return;
    }

    const config = await getConfig();

    const result = await build({
      plugins: [httpPlugin(), fsPlugin()],
      ...config,
    });

    result.outputFiles?.forEach((file) => {
      outputWindow.appendLine(
        `Output file complete: ${file.path} - ${file.contents.length} bytes`
      );

      workspace.fs.writeFile(
        Uri.joinPath(workspace.workspaceFolders![0].uri, file.path),
        file.contents
      );
    });
  } catch (error) {
    outputWindow.appendLine(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
