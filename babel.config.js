// eslint-disable-next-line import/no-commonjs
module.exports = (api) => {
  if (api) {
    api.cache(true);
    api.debug = process.env.NODE_ENV === 'development' || false;
  }

  return {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      './plugins/remove-flask-code.js',
      'transform-inline-environment-variables',
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
