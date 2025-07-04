import {
  commands,
  ExtensionContext,
  window,
  workspace,
  Uri,
  OutputChannel,
} from "vscode";
import * as esbuild from "esbuild-wasm";

let initialized = false;
let outputWindow: OutputChannel;

export async function activate(context: ExtensionContext) {
  if (!initialized) {
    await esbuild.initialize({
      worker: true,
      wasmURL: "https://unpkg.com/esbuild-wasm/esbuild.wasm",
    });
    initialized = true;
    outputWindow = window.createOutputChannel("esbuild");
    outputWindow.show();
  }

  commands.registerCommand("vscode-web-esbuild.build", async (uri) => {
    if (uri instanceof Uri) {
      outputWindow.appendLine(`Building from URI: ${uri.toString()}`);
      await buildFromUri(uri);
    }
  });


}

async function buildFromUri(uri: Uri) {
  try {
    const result = await esbuild.build({
      entryPoints: [uri.toString()],
      bundle: true,
      plugins: [vscodeFsPlugin()],
      format: "esm",
      outdir: "dist",
    });
    result.outputFiles?.forEach((file) => {
      outputWindow.appendLine(`Output file: ${file.path}`);
      outputWindow.appendLine(file.text);
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

function vscodeFsPlugin(): esbuild.Plugin {
  return {
    name: "vscode-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args: esbuild.OnResolveArgs) => {
        outputWindow.appendLine(
          `Resolving: ${args.path} from ${args.importer}`
        );

        if (args.path.startsWith(".")) {
          const index = args.importer.lastIndexOf("/");

          return {
            path: args.importer.slice(0, index) + args.path.slice(1),
            namespace: "vscode-fs",
          };
        }

        return {
          path: args.path,
          namespace: "vscode-fs",
        };
      });

      build.onLoad({ filter: /.*/, namespace: "vscode-fs" }, async (args) => {
        try {
          outputWindow.appendLine(`Loading file: ${args.path}`);
          const bytes = await workspace.fs.readFile(Uri.parse(args.path));
          return {
            contents: bytes,
            loader: "default",
          };
        } catch (err) {
          return {
            errors: [{ text: `Failed to read file: ${args.path}` }],
          };
        }
      });
    },
  };
}
