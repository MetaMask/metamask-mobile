const ReactCompilerConfig = {
  target: '18',
};

// eslint-disable-next-line import/no-commonjs
module.exports = {
  ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
  presets: ['babel-preset-expo'],
  // Babel can find the plugin without the `babel-plugin-` prefix. Ex. `babel-plugin-react-compiler` -> `react-compiler`
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    [
      'react-compiler',
      {
        target: '18',
        sources: (filename) => {
          // Match file paths or directories to include in the React Compiler.
          const pathsToInclude = [
            'app/components/Nav',
            'app/components/UI/DeepLinkModal',
          ];
          return pathsToInclude.some((path) => filename.includes(path));
        },
      },
    ],
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
      test: './node_modules/@deeeed/hyperliquid-node20',
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
    },
    {
      test: './node_modules/@noble/secp256k1',
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
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
    {
      test: './app/core/OAuthService/OAuthLoginHandlers',
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
