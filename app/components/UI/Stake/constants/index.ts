/* eslint-disable import/prefer-default-export */
export const isPooledStakingFeatureEnabled = () =>
  process.env.MM_POOLED_STAKING_UI_ENABLED === 'true';

export const POOLED_STAKING_FAQ_URL =
  'https://support.metamask.io/metamask-portfolio/move-crypto/stake/staking-pool/';
