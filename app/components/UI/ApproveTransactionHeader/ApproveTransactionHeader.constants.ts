import AppConstants from '../../../core/AppConstants';

// eslint-disable-next-line import/prefer-default-export
export const MAX_DOMAIN_TITLE_LENGTH = 18;
export const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

export const FAV_ICON_URL = (hostUrl: string) =>
  `https://api.faviconkit.com/${hostUrl}/64`;
