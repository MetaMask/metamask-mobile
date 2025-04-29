/* eslint-disable import/no-commonjs */

const baseConfig = require('./babel.config');

const newPlugins = baseConfig.plugins.filter(
  (plugin) => plugin !== 'transform-inline-environment-variables',
);

const newOverrides = [
  ...baseConfig.overrides,
  // Don't transform environment variables for files that depend on them.
  {
    exclude: [
      'app/store/migrations/**',
      'app/core/Engine/controllers/network-controller/messenger-action-handlers.test.ts',
      'app/util/networks/customNetworks.tsx',
      'app/components/UI/Earn/selectors/featureFlags/index.ts',
    ],
    plugins: ['transform-inline-environment-variables'],
  },
];

module.exports = {
  ...baseConfig,
  plugins: newPlugins,
  overrides: newOverrides,
};
