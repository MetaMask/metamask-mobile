import AppConstants from '../../../core/AppConstants';

export const IPFS_GATEWAY_DISABLED_ERROR =
  'IPFS gateway is disabled on security and privacy settings';
export const { HOMEPAGE_URL, NOTIFICATION_NAMES, OLD_HOMEPAGE_URL_HOST } =
  AppConstants;
export const HOMEPAGE_HOST = new URL(HOMEPAGE_URL)?.hostname;
export const MM_MIXPANEL_TOKEN = process.env.MM_MIXPANEL_TOKEN;
