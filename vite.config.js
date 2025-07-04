import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/extension.ts'),
            formats: ['cjs'],
            fileName: () => 'extension.js',
        },
        minify: false,
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name][extname]',
            },
            external: ['vscode'],
            plugins: [
                // Inline .wasm and other assets as base64
                {
                    name: 'inline-wasm-assets',
                    enforce: 'post',
                    async load(id) {
                        if (id.endsWith('.wasm')) {
                            const data = fs.readFileSync(id);
                            const base64 = data.toString('base64');
                            return `export default "data:application/wasm;base64,${base64}";`;
                        }
                    }
                }
            ]
        },
        assetsInlineLimit: 100000000, // Large limit to inline all assets
    },
    assetsInclude: ['**/*.wasm'],
});