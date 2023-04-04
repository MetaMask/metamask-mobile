// eslint-disable-next-line import/no-commonjs
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'transform-inline-environment-variables',
    'react-native-reanimated/plugin',
    // [
    //   '@babel/plugin-transform-react-jsx',
    //   {
    //     // throwIfNamespace: false,
    //   },
    // ],
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
