import { OnResolveArgs, Plugin } from "esbuild-wasm";
import { FileType, Uri, workspace } from "vscode";

export function fsPlugin(): Plugin {
  return {
    name: "vscode-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args: OnResolveArgs) => {
        const absPath = getPath(args);
        const path = await getExtension(absPath);
        if (path) {
          return {
            path,
            namespace: "vscode-fs",
          };
        }
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

function getPath(args: OnResolveArgs): string {
  if (args.path.startsWith("/")) {
    return Uri.joinPath(
      workspace.workspaceFolders![0].uri,
      args.path
    ).toString();
  }

  if (args.path.startsWith("./")) {
    const index = args.importer.lastIndexOf("/");
    return args.importer.slice(0, index) + args.path.slice(1);
  }

  if (args.path.startsWith("../")) {
    const parts = args.path.split("/");
    const importerParts = args.importer.split("/");
    importerParts.pop();
    let i = 0
    for (const part of parts) {
      if (part === "..") {
        importerParts.pop(); // Go up one directory
        i++
      }else{
        break
      }
    }
     // Remove the last part (file name)
    return importerParts.concat(parts.slice(i)).join("/");
  }

  return args.path;
}

async function getExtension(path: string): Promise<string | undefined> {
  if (await fileExists(path)) {
    return path;
  }

  if (await fileExists(path + ".tsx")) {
    return path + ".tsx";
  }

  if (await fileExists(path + ".js")) {
    return path + ".js";
  }

  if (await fileExists(path + ".ts")) {
    return path + ".ts";
  }

  if (await fileExists(path + ".jsx")) {
    return path + ".jsx";
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await workspace.fs.stat(Uri.parse(path));
    return stat.type === FileType.File;
  } catch (err) {
    return false;
  }
}
