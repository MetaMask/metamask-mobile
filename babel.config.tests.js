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
      'app/core/Engine/controllers/gator-permissions-controller/gator-permissions-controller-init.ts',
      'app/core/Engine/controllers/gator-permissions-controller/gator-permissions-controller-init.test.ts',
      'app/core/Engine/controllers/remote-feature-flag-controller/utils.ts',
      'app/core/Engine/controllers/remote-feature-flag-controller/utils.test.ts',
      'app/components/UI/Ramp/Deposit/sdk/getSdkEnvironment.ts',
      'app/components/UI/Ramp/Deposit/sdk/getSdkEnvironment.test.ts',
      'app/components/UI/Ramp/Aggregator/sdk/getSdkEnvironment.ts',
      'app/components/UI/Ramp/Aggregator/sdk/getSdkEnvironment.test.ts',
      'app/core/Engine/controllers/ramps-controller/ramps-service-init.ts',
      'app/core/Engine/controllers/ramps-controller/ramps-service-init.test.ts',
      'app/components/UI/Ramp/hooks/useRampsUnifiedV1Enabled.ts',
      'app/components/UI/Ramp/hooks/useRampsUnifiedV1Enabled.test.ts',
      'app/components/UI/Ramp/hooks/useRampsUnifiedV2Enabled.ts',
      'app/components/UI/Ramp/hooks/useRampsUnifiedV2Enabled.test.ts',
      'app/components/UI/Ramp/hooks/useRampsSmartRouting.ts',
      'app/components/UI/Ramp/hooks/useRampsSmartRouting.test.ts',
      'app/components/UI/Ramp/hooks/useRampTokens.ts',
      'app/components/UI/Ramp/hooks/useRampTokens.test.ts',
      'app/core/Engine/controllers/rewards-controller/utils/rewards-api-url.ts',
      'app/core/Engine/controllers/rewards-controller/utils/rewards-api-url.test.ts',
      'app/components/UI/Card/util/mapBaanxApiUrl.ts',
      'app/components/UI/Card/util/mapBaanxApiUrl.test.ts',
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
