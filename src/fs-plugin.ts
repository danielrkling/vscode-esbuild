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
  if (args.path.startsWith("/") || args.kind === "entry-point") {
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
    let i = 0;
    for (const part of parts) {
      if (part === "..") {
        importerParts.pop(); // Go up one directory
        i++;
      } else {
        break;
      }
    }
    // Remove the last part (file name)
    return importerParts.concat(parts.slice(i)).join("/");
  }

  return args.path;
}

const extensions = [
  "",
  ".ts",
  ".tsx",
  ".js",  
  ".jsx",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];

async function getExtension(path: string): Promise<string | undefined> {
  for (const ext of extensions) {
    const fullPath = path + ext;
    if (await fileExists(fullPath)) {
      return fullPath;
    }
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
