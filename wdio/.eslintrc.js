// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: false,
    es2021: true,
  },
  parser: '@babel/eslint-parser',
  extends: [
    'eslint:recommended',
  ],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
  },
  globals: {
    driver: 'readonly',
    $: 'readonly',
    expect: 'readonly',
  },
};
