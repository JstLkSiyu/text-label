import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import tsc from 'typescript';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm'
  },
  plugins: [
    typescript({
      typescript: tsc,
    })
  ]
})