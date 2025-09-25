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
      'app/components/UI/Earn/selectors/featureFlags/index.ts',
      'app/components/UI/Perps/selectors/featureFlags/index.ts',
      'app/core/Engine/controllers/network-controller/utils.ts',
      'app/core/Engine/controllers/network-controller/utils.test.ts',
      'app/store/migrations/**',
      'app/util/networks/customNetworks.tsx',
    ],
    plugins: ['transform-inline-environment-variables'],
  },
];

module.exports = {
  ...baseConfig,
  plugins: newPlugins,
  overrides: newOverrides,
};
