/// <reference types="vitest" />
import path from 'path';
import packageJson from './package.json';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: packageJson.name,
    },
    minify: false,
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  plugins: [dts(), eslint({
    failOnError: false
  })],
  test: {
    includeSource: ['src/**/*.{js,ts}'],
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['text', 'json-summary', 'json'],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
    }
  }
});
