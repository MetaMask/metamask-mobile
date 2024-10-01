// eslint-disable-next-line import/no-commonjs
module.exports = {
  ignore: [/ses\.cjs/],
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'transform-inline-environment-variables',
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        alias: {
          actions: './app/actions',
          animations: './app/animations',
          'component-library': './app/component-library',
          components: './app/components',
          constants: './app/constants',
          core: './app/core',
          declarations: './app/declarations',
          fonts: './app/fonts',
          images: './app/images',
          lib: './app/lib',
          reducers: './app/reducers',
          selectors: './app/selectors',
          store: './app/store',
          styles: './app/styles',
          util: './app/util',
          videos: './app/videos',
          'keystonehq/ur-decoder': './app/declarations/@keystonehq/ur-decoder.ts',
          docs: './docs',
          e2e: './e2e',
          locales: './locales',
          patches: './patches',
          ppom: './ppom',
          scripts: './scripts',
          sourcemaps: './sourcemaps',
          storybook: './storybook',
          wdio: './wdio',
        },
      },
    ],
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
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
  comments: false,
  compact: true,
};
