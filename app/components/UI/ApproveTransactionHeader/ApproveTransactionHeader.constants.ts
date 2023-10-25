import AppConstants from '../../../core/AppConstants';
export const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;
export const APPROVE_TRANSACTION_ORIGIN_PILL =
  'approve_transaction_origin_pill';

export const FAV_ICON_URL = (hostUrl: string) =>
  `https://api.faviconkit.com/${hostUrl}/64`;
