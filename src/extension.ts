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
import { nodeResolvePlugin } from "./node-resolve";
import { debounce } from "ts-debounce";
import { aliasPlugin } from "./alias-plugin";

let initialized = false;
let outputWindow: OutputChannel;
let watcher: FileSystemWatcher | undefined;

const defaultConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outdir: "dist",
  minify: false,
  format: "esm",
};

const buildDebounce = debounce(buildConfig, 200, { maxWait: 2000 });

export async function activate(context: ExtensionContext) {
  if (!initialized) {
    await initialize({
      worker: true,
      wasmURL: "https://esm.sh/esbuild-wasm@0.25.8/esbuild.wasm",
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

    watcher.onDidChange(() => buildDebounce());
    watcher.onDidCreate(() => buildDebounce());
    watcher.onDidDelete(() => buildDebounce());
    outputWindow.appendLine(`Starting file watcher for ${glob}`);
    buildConfig();
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

let lastModified: number;
let lastConfig: any;
async function getConfig() {
  try {
    const configPath: string =
      workspace.getConfiguration("vscode-web-esbuild").get("configPath") ||
      "esbuild.config.json";
    const configUri = Uri.joinPath(
      workspace.workspaceFolders![0].uri,
      configPath
    );
    const stat = await workspace.fs.stat(configUri);
    if (lastModified && stat.mtime <= lastModified) {
      return lastConfig;
    }
    lastModified = stat.mtime;

    lastConfig = await workspace.fs.readFile(configUri).then(
      async (buffer) => {
        workspace.decode(buffer);
        outputWindow.appendLine(
          `Reading config file: ${configPath.toString()}`
        );
        const configContents = await workspace.decode(buffer);
        return JSON.parse(configContents);
      },
      async () => {
        outputWindow.appendLine(`No config file found, using default config.`);
        await workspace.fs.writeFile(
          Uri.joinPath(workspace.workspaceFolders![0].uri, configPath),
          await workspace.encode(JSON.stringify(defaultConfig, null, 2))
        );
        return defaultConfig;
      }
    );

    return lastConfig;
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
      plugins: [aliasPlugin, httpPlugin(), nodeResolvePlugin],
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
