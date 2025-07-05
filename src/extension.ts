import {
  commands,
  ExtensionContext,
  window,
  workspace,
  Uri,
  OutputChannel,
} from "vscode";
import { initialize, build } from "esbuild-wasm";
import { fsPlugin } from "./fs-plugin";
import { httpPlugin } from "./http-plugin";

let initialized = false;
let outputWindow: OutputChannel;

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

  commands.registerCommand("vscode-web-esbuild.build", async (uri) => {
    if (uri instanceof Uri) {
      await buildFromUri(uri);
    } else {
      const uri = Uri.joinPath(
        workspace.workspaceFolders![0].uri,
        workspace.getConfiguration("vscode-web-esbuild").get("entryPoint") ||
          "src/index.ts"
      );
      await buildFromUri(uri);
    }
  });
}

async function buildFromUri(uri: Uri) {
  try {
    outputWindow.appendLine(`Building from URI: ${uri.toString()}`);
    // const tsconfig = await workspace.fs.readFile(Uri.joinPath(workspace.workspaceFolders![0].uri,
    //     workspace.getConfiguration("vscode-web-esbuild").get("tsconfig") || "tsconfig.json"
    //   ))
    const result = await build({
      entryPoints: [uri.toString()],
      bundle: true,
      plugins: [httpPlugin(),fsPlugin()],
      format: workspace.getConfiguration("vscode-web-esbuild").get("format"),
      outdir: workspace.getConfiguration("vscode-web-esbuild").get("outdir"),
      minify: workspace.getConfiguration("vscode-web-esbuild").get("minify"),
      //   tsconfigRaw: tsconfig
      //   sourcemap: workspace
      //     .getConfiguration("vscode-web-esbuild")
      //     .get("sourcemap"),
    });
    result.outputFiles?.forEach((file) => {
      outputWindow.appendLine(
        `Output file complete: ${file.path} - ${file.contents.length} bytes`
      );
      if (!workspace.workspaceFolders) {
        outputWindow.appendLine("No workspace folders found.");
        return;
      }
      workspace.fs.writeFile(
        Uri.joinPath(workspace.workspaceFolders[0].uri, file.path),
        file.contents
      );
    });
  } catch (error) {
    outputWindow.appendLine(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
