import type { Plugin } from "esbuild";

export interface AliasOptions {
  [find: string]: string;
}

export const aliasPlugin: Plugin = {
  name: "alias-plugin",
  setup(build) {
    const aliases: AliasOptions = build.initialOptions.alias || {};
    const aliasKeys = Object.keys(aliases);

    build.onResolve({ filter: /.*/ }, (args) => {
      for (const key of aliasKeys) {
        if (args.path === key || args.path.startsWith(key + "/")) {
          const replacement = aliases[key] + args.path.slice(key.length);
          return {
            path: replacement,
            namespace: args.namespace,
          };
        }
      }
      return;
    });
  },
};
