import enContent from '../../../locales/languages/en.json';

const CONFIRMATION_FOOTER_PREFIX = 'earn-lending-confirmation-footer';

export const EarnLendingViewSelectorsIDs = {
  WITHDRAW_BUTTON: 'withdraw-button',
  DEPOSIT_BUTTON: 'deposit-button',
  CONFIRMATION_FOOTER: CONFIRMATION_FOOTER_PREFIX,
  CONFIRM_BUTTON: `${CONFIRMATION_FOOTER_PREFIX}-confirm-button`,
  CANCEL_BUTTON: `${CONFIRMATION_FOOTER_PREFIX}-cancel-button`,
  DEPOSIT_INFO_SECTION: 'depositDetailsSection',
  DEPOSIT_RECEIVE_SECTION: 'depositReceiveSection',
  PROGRESS_BAR: 'progress-stepper-progress-bar',
  REVIEW_BUTTON: 'review-button',
};

export const EarnLendingViewSelectorsText = {
  SUPPLY: enContent.earn.supply,
  WITHDRAWAL_TIME: enContent.earn.withdrawal_time,
};
