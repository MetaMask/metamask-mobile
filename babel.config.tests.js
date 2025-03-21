/* eslint-disable import/no-commonjs */

const baseConfig = require('./babel.config');

const newPlugins = baseConfig.plugins.filter(
  (plugin) => plugin !== 'transform-inline-environment-variables',
);

const newOverrides = [
  ...baseConfig.overrides,
  // Don't transform environment variables for migration files when running
  // tests as some tests rely on them to be set or unset, depending on the case.
  {
    exclude: ['app/store/migrations/**'],
    plugins: ['transform-inline-environment-variables'],
  },
];

module.exports = {
  ...baseConfig,
  plugins: newPlugins,
  overrides: newOverrides,
};
