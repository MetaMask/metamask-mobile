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
      test: [
        './node_modules/**/@metamask/rpc-errors/**',
        './node_modules/@metamask/rpc-errors/**',
      ],
      plugins: [
        ['@babel/plugin-transform-classes', { loose: true }],
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ],
    },
    {
      test: './app/lib/snaps',
      plugins: [['babel-plugin-inline-import', { extensions: ['.html'] }]],
    },
    // Applying consistent "loose" mode here too:
    {
      test: './app/core/redux/ReduxService.ts',
      plugins: [
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ],
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
