/* eslint-disable import/prefer-default-export */
export const isPooledStakingFeatureEnabled = () =>
  process.env.MM_POOLED_STAKING_UI_ENABLED === 'true';
