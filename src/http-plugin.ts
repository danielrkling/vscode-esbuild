import { Plugin } from "esbuild-wasm";
export function httpPlugin(): Plugin {
  return {
    name: "browser-resolver",
    async setup(build) {
      // Intercept import paths starting with "https://" or "http://" so
      // esbuild doesn't attempt to map them to a file system location.
      build.onResolve({ filter: /^http[s]{0,1}:\/\// }, (args) => ({
        path: args.path,
        namespace: "http-url",
      }));

      // We also want to intercept all import paths inside downloaded
      // files and resolve them against the original URL. All of these
      // files will be in the "http-url" namespace. Make sure to keep
      // the newly resolved URL in the "http-url" namespace so imports
      // inside it will also be resolved as URLs recursively.
      build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => ({
        path: new URL(args.path, args.importer).toString(),
        namespace: "http-url",
      }));

      // When a URL is loaded, we want to actually download the content
      // from the internet.
      build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
        const url = new URL(args.path);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: status=${res.statusText}`);
        }

        const body = await res.text();
        return {
          contents: body,
          // ESBuild can't get extension from a URL so it falls back to js loader.
          loader: resolveLoader(url),
        };
      });
    },
  };
}

function resolveLoader(url: URL) {
  if (url.pathname.endsWith(".ts")) {
    return "ts";
  }

  if (url.pathname.endsWith(".tsx")) {
    return "tsx";
  }

  return undefined;
}
