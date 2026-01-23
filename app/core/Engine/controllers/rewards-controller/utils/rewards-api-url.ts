// URL is set at build time via builds.yml, fallback for local dev
const DEFAULT_REWARDS_API_URL = 'https://rewards.uat-api.cx.metamask.io';

export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  _metaMaskEnv: string | undefined,
) =>
  // Environment-specific URL is now set at build time via builds.yml
  process.env.REWARDS_API_URL || DEFAULT_REWARDS_API_URL;
