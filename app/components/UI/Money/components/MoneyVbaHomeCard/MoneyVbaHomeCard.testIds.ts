import type { MoneyVbaHomeCardVariant } from './MoneyVbaHomeCardConfig';

/**
 * Per-variant test IDs for `MoneyVbaHomeCard`. Values are stable identifiers
 * for view tests and E2E; the slugs mirror the pre-consolidation card names.
 */
export const MONEY_VBA_HOME_CARD_TEST_IDS: Record<
  MoneyVbaHomeCardVariant,
  {
    CONTAINER: string;
    TITLE: string;
    DESCRIPTION: string;
    CTA_BUTTON: string;
    DISMISS_BUTTON?: string;
  }
> = {
  get_started: {
    CONTAINER: 'money-vba-get-started-card-container',
    TITLE: 'money-vba-get-started-card-title',
    DESCRIPTION: 'money-vba-get-started-card-description',
    CTA_BUTTON: 'money-vba-get-started-card-cta-button',
  },
  account_is_ready: {
    CONTAINER: 'money-vba-account-ready-card-container',
    TITLE: 'money-vba-account-ready-card-title',
    DESCRIPTION: 'money-vba-account-ready-card-description',
    CTA_BUTTON: 'money-vba-account-ready-card-cta-button',
  },
  account_pending: {
    CONTAINER: 'money-vba-account-pending-card-container',
    TITLE: 'money-vba-account-pending-card-title',
    DESCRIPTION: 'money-vba-account-pending-card-description',
    CTA_BUTTON: 'money-vba-account-pending-card-cta-button',
  },
  kyc_pending: {
    CONTAINER: 'money-vba-kyc-pending-card-container',
    TITLE: 'money-vba-kyc-pending-card-title',
    DESCRIPTION: 'money-vba-kyc-pending-card-description',
    CTA_BUTTON: 'money-vba-kyc-pending-card-cta-button',
  },
  finish_verification: {
    CONTAINER: 'money-vba-finish-verification-card-container',
    TITLE: 'money-vba-finish-verification-card-title',
    DESCRIPTION: 'money-vba-finish-verification-card-description',
    CTA_BUTTON: 'money-vba-finish-verification-card-cta-button',
  },
  kyc_decision: {
    CONTAINER: 'money-vba-kyc-decision-card-container',
    TITLE: 'money-vba-kyc-decision-card-title',
    DESCRIPTION: 'money-vba-kyc-decision-card-description',
    CTA_BUTTON: 'money-vba-kyc-decision-card-cta-button',
    DISMISS_BUTTON: 'money-vba-kyc-decision-card-dismiss-button',
  },
};
