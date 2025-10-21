import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/fex.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: `.js`  // ← .mjs 대신 .js 사용
    }
  }
})
