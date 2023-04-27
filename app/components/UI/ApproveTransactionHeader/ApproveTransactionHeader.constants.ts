import AppConstants from '../../../core/AppConstants';

export const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

export const FAV_ICON_URL = (hostUrl: string) =>
  `https://api.faviconkit.com/${hostUrl}/64`;
