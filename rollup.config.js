export default {
    input: 'src/extension.ts',
    output: {
        file: 'dist/extension.js',
        format: 'es',
        sourcemap: true,
    },
    plugins: [
        require('@rollup/plugin-node-resolve').nodeResolve(),
        require('@rollup/plugin-commonjs')(),
        require('@rollup/plugin-typescript')({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        }),
    ],
    external: ['vscode'],
}