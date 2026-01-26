/* eslint-disable import/no-commonjs */
require('@babel/register');

// Configure ts-node with options that will properly handle .d.ts files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    allowJs: true,
    esModuleInterop: true,
    skipLibCheck: true,
  },
  files: true,
});

require('./json-rpc-coverage.js');
