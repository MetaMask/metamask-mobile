import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import AppConstants from '../../../../core/AppConstants';

// Not using enum because we want to use existing URL constants.
export const MONEY_URLS = {
  MONEY_LANDING: AppConstants.URLS.MONEY_LANDING,
  MUSD_PRICE: AppConstants.URLS.MUSD_PRICE,
  METAMASK_SUPPORT: METAMASK_SUPPORT_URL,
  CARD_FEES: AppConstants.CARD.CARD_FEES_URL,
} as const;

export type MONEY_URLS = (typeof MONEY_URLS)[keyof typeof MONEY_URLS];
