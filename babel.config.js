// eslint-disable-next-line import/no-commonjs
module.exports = {
  ignore: [/\/ses\.cjs/],
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
      test: './node_modules/@metamask/bridge-controller',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: [
        './node_modules/**/@metamask/rpc-errors/**',
        './node_modules/@metamask/rpc-errors/**',
      ],
      plugins: [['@babel/plugin-transform-classes', { loose: true }]],
    },
    {
      test: './app/lib/snaps',
      plugins: [['babel-plugin-inline-import', { extensions: ['.html'] }]],
    },
    // TODO: Remove this once we have a fix for the private methods
    // Do not apply this plugin globally since it breaks FlatList props.getItem
    {
      test: './app/core/redux/ReduxService.ts',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: './app/core/Engine/Engine.ts',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: './app/core/NavigationService/NavigationService.ts',
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
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
