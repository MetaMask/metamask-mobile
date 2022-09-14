// eslint-disable-next-line import/no-commonjs
module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: false,
    es2021: true,
  },
  parser: 'babel-eslint',
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
    $: 'readonly'
  },
};
