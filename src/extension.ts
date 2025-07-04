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
    const result = await esbuild.build({
      entryPoints: [uri.toString()],
      bundle: true,
      plugins: [vscodeFsPlugin()],
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

function vscodeFsPlugin(): esbuild.Plugin {
  return {
    name: "vscode-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args: esbuild.OnResolveArgs) => {
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
