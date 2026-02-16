#!/usr/bin/env node
/* eslint-disable import/no-nodejs-modules */
import esbuild from 'esbuild';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [resolve(__dirname, 'server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(__dirname, 'dist/server.mjs'),
  sourcemap: true,
  // Packages that use React Native / Flow syntax or are ESM-only
  // with native bindings that can't be bundled
  external: [
    'react-native',
    'react-native-nitro-modules',
    '@metamask/native-utils',
    // Native addons / optional deps that can't be bundled
    'playwright',
    'playwright-core',
    'fsevents',
    'dtrace-provider',
    'chromium-bidi',
  ],
  // Resolve .ts extensions used in test framework imports (e.g., './logger.ts')
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  banner: {
    js: [
      // ESM shims for __dirname and require() used by some CJS dependencies
      'import { createRequire } from "module";',
      'import { fileURLToPath as __fileURLToPath } from "url";',
      'import { dirname as __dirname_fn } from "path";',
      'const require = createRequire(import.meta.url);',
      'const __filename = __fileURLToPath(import.meta.url);',
      'const __dirname = __dirname_fn(__filename);',
    ].join('\n'),
  },
});

console.error(
  'MCP server bundled → e2e/llm-workflow/mcp-server/dist/server.mjs',
);
