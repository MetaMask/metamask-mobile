module.exports = {
  env: {
    'browser': true,
  },

  extends: [
    '@metamask/eslint-config',
  ],

  plugins: [
    'json',
  ],

  overrides: [
    {
      files: ['*.ts'],
      extends: [
        '@metamask/eslint-config/config/typescript',
      ],
    },
    {
      files: [
        '*.js',
        '*.json',
      ],
      parserOptions: {
        sourceType: 'script',
      },
      extends: [
        '@metamask/eslint-config/config/nodejs',
      ],
    },
  ],

  ignorePatterns: [
    '!.eslintrc.js',
    'dist/',
  ],
};
