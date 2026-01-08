/**
 * Feature flag names that can be overridden in development tools.
 * These correspond to remote feature flags that have selector implementations
 * in app/selectors/featureFlagController/
 */
export enum FeatureFlagNames {
  rewardsEnabled = 'rewardsEnabled',
  otaUpdatesEnabled = 'otaUpdatesEnabled',
  rewardsEnableMusdHolding = 'rewardsEnableMusdHolding',
  fullPageAccountList = 'fullPageAccountList',
  importSrpWordSuggestion = 'importSrpWordSuggestion',
}
