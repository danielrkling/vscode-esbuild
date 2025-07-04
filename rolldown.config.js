import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/extension',
  output: {
    dir: 'dist',
    format: 'cjs',
    assetFileNames: '[name][extname]',
  },
  
  external: ['vscode'],
  
});