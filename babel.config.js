// eslint-disable-next-line import/no-commonjs
module.exports = {
  ignore: [/ses\.cjs/],
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'transform-inline-environment-variables',
    'react-native-reanimated/plugin',
  ],
  overrides: [
    {
      test: './node_modules/marked',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          { targets: { node: 'current' }, modules: 'auto' },
        ],
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
  comments: false,
  compact: true,
};
