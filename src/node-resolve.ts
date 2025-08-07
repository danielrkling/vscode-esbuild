import { OnResolveArgs, Plugin } from "esbuild-wasm";
import { FileType, Uri, workspace } from "vscode";

const fs = workspace.fs;
const extensions = ["", ".ts", ".tsx", ".js", ".mjs", ".jsx", ".json"];

async function fileExists(uri: Uri): Promise<boolean> {
  try {
    const stat = await fs.stat(uri);
    return stat.type === FileType.File;
  } catch {
    return false;
  }
}

async function directoryExists(uri: Uri): Promise<boolean> {
  try {
    const stat = await fs.stat(uri);
    return stat.type === FileType.Directory;
  } catch {
    return false;
  }
}

async function resolveFileWithExtensions(uri: Uri): Promise<Uri | null> {
  for (const ext of extensions) {
    const fullPath = Uri.parse(uri.toString() + ext);
    if (await fileExists(fullPath)) return fullPath;
  }
  return null;
}

async function resolveDirectory(uri: Uri): Promise<Uri | null> {
  const packageUri = Uri.joinPath(uri, "package.json");
  if (await fileExists(packageUri)) {
    try {
      const pkg = JSON.parse(
        await workspace.decode(await fs.readFile(packageUri))
      );
      if (pkg.module || pkg.main) {
        const entry = Uri.joinPath(uri, pkg.module || pkg.main);
        const resolved =
          resolveFileWithExtensions(entry) || resolveAsDirectory(entry);
        if (resolved) return resolved;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return resolveFileWithExtensions(Uri.joinPath(uri, "index"));
}

async function resolveAsDirectory(uri: Uri): Promise<Uri | null> {
  if (await directoryExists(uri)) {
    return resolveDirectory(uri);
  }
  return null;
}

async function resolveNodeModules(
  importPath: string,
  importerDir: Uri
): Promise<Uri | null> {
  let currentDir = importerDir;
  while (true) {
    const nodeModulesPath = Uri.joinPath(
      currentDir,
      "node_modules",
      importPath
    );
    const resolved =
      (await resolveFileWithExtensions(nodeModulesPath)) ||
      (await resolveAsDirectory(nodeModulesPath));
    if (resolved) return resolved;

    const parentDir = Uri.joinPath(currentDir, "../");
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

export const nodeResolvePlugin: Plugin = {
  name: "node-resolve",
  setup(build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
      const { path } = args;
      const resolveDir =
        args.kind === "entry-point"
          ? workspace.workspaceFolders![0].uri
          : Uri.parse(args.importer.split("/").slice(0, -1).join("/"));

      if (
        path.startsWith(".") ||
        path.startsWith("/") ||
        args.kind === "entry-point"
      ) {
        const basePath = Uri.joinPath(resolveDir, path);
        const resolved =
          (await resolveFileWithExtensions(basePath)) ||
          (await resolveAsDirectory(basePath));
        if (resolved) {
          return { path: resolved.toString(), namespace: "vscode-fs" };
        }
      } else {
        const importerDir = resolveDir;
        const resolved = await resolveNodeModules(path, importerDir);
        if (resolved) {
          return { path: resolved.toString(), namespace: "vscode-fs" };
        }
      }

      return { external: true }; // fallback if nothing is resolved
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
