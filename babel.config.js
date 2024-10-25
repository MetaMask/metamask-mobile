// eslint-disable-next-line import/no-commonjs
module.exports = {
  ignore: [/ses\.cjs/],
  presets: ['babel-preset-expo'],
  plugins: [
    'transform-inline-environment-variables',
    'react-native-reanimated/plugin',
  ],
  overrides: [
    {
      test: './node_modules/marked',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: './node_modules/@metamask/profile-sync-controller',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: './node_modules/@metamask/notification-services-controller',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: './app/lib/snaps',
      plugins: [['babel-plugin-inline-import', { extensions: ['.html'] }]],
    },
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
  comments: false,
  compact: true,
};
