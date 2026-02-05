import { ApprovalType } from '@metamask/controller-utils';
import enContent from '../../../../locales/languages/en.json';

export const ConfirmationTopSheetSelectorsIDs = {
  SECURITY_ALERT_BANNER: 'security-alert-banner',
  SECURITY_ALERT_RESPONSE_FAILED_BANNER:
    'security-alert-response-failed-banner',
  SECURITY_ALERT_BANNER_REDESIGNED: 'security-alert-banner-0',
} as const;

export const ConfirmationTopSheetSelectorsText = {
  BANNER_FAILED_TITLE: enContent.blockaid_banner.failed_title,
  BANNER_FAILED_DESCRIPTION: enContent.blockaid_banner.failed_description,
  BANNER_MALICIOUS_TITLE: enContent.blockaid_banner.deceptive_request_title,
  BANNER_MALICIOUS_DESCRIPTION:
    enContent.blockaid_banner.malicious_domain_description,
} as const;

export const ConfirmationRequestTypeIDs = {
  PERSONAL_SIGN_REQUEST: ApprovalType.PersonalSign,
  TYPED_SIGN_REQUEST: ApprovalType.EthSignTypedData,
  TRANSACTION_REQUEST: ApprovalType.Transaction,
} as const;

export const ConfirmationUIType = {
  MODAL: 'modal-confirmation-container',
  FLAT: 'flat-confirmation-container',
} as const;

export const ConfirmationRowComponentIDs = {
  ACCOUNT_NETWORK: 'account-network',
  ADVANCED_DETAILS: 'advanced-details',
  APPROVE_ROW: 'approve-row',
  BRIDGE_TIME: 'bridge-time',
  FROM_TO: 'from-to',
  GAS_FEES_DETAILS: 'gas-fees-details',
  GAS_FEE_TOKEN_PILL: 'selected-gas-fee-token',
  MESSAGE: 'message',
  NETWORK: 'network',
  ORIGIN_INFO: 'origin-info',
  PAID_BY_METAMASK: 'paid-by-metamask',
  PAY_WITH: 'pay-with',
  SIMULATION_DETAILS: 'simulation-details',
  SIWE_SIGNING_ACCOUNT_INFO: 'siwe-signing-account-info',
  STAKING_DETAILS: 'staking-details',
  TOKEN_HERO: 'token-hero',
  TOTAL: 'total',
  RECEIVE: 'receive',
  TRANSACTION_FEE: 'transaction-fee',
  NETWORK_FEE: 'network-fee',
} as const;

export const ConfirmationFooterSelectorIDs = {
  CANCEL_BUTTON: 'cancel-button',
  CONFIRM_BUTTON: 'confirm-button',
} as const;

export const ConfirmAlertModalSelectorsIDs = {
  CONFIRM_ALERT_CHECKBOX: 'confirm-alert-checkbox',
  CONFIRM_ALERT_BUTTON: 'confirm-alert-confirm-button',
  CONFIRM_ALERT_MODAL: 'confirm-alert-modal',
} as const;

export const AlertModalSelectorsIDs = {
  ALERT_MODAL_CHECKBOX: 'alert-modal-checkbox',
  ALERT_MODAL_ACKNOWLEDGE_BUTTON: 'alert-modal-acknowledge-button',
} as const;

export const AlertModalSelectorsText = {
  ALERT_ORIGIN_MISMATCH_TITLE: enContent.alert_system.domain_mismatch.title,
} as const;

export const AlertTypeIDs = {
  INLINE_ALERT: 'inline-alert',
} as const;

export const ApproveComponentIDs = {
  SPENDING_CAP_VALUE: 'spending-cap-value',
  EDIT_SPENDING_CAP_BUTTON: 'edit-spending-cap-button',
  EDIT_SPENDING_CAP_INPUT: 'edit-spending-cap-input',
  EDIT_SPENDING_CAP_SAVE_BUTTON: 'edit-spending-cap-save-button',
} as const;

export const GasFeeTokenSelectorIDs = {
  SELECTED_GAS_FEE_TOKEN_SYMBOL: 'selected-gas-fee-token-symbol',
  SELECTED_GAS_FEE_TOKEN_ARROW: 'selected-gas-fee-token-arrow',
} as const;

export const GasFeeTokenModalSelectorsText = {
  GAS_FEE_TOKEN_ITEM: 'gas-fee-token-list-item',
  GAS_FEE_TOKEN_AMOUNT: 'gas-fee-token-list-item-amount-token',
  GAS_FEE_TOKEN_BALANCE: 'gas-fee-token-list-item-balance',
  GAS_FEE_TOKEN_SYMBOL: 'gas-fee-token-list-item-symbol',
  GAS_FEE_TOKEN_AMOUNT_FIAT: 'gas-fee-token-list-item-amount-fiat',
} as const;

export const TransactionPayComponentIDs = {
  CLOSE_MODAL_BUTTON: 'bridge-token-selector-close-button',
  KEYBOARD_CONTINUE_BUTTON: 'deposit-keyboard-done-button',
  PAY_WITH_BALANCE: 'pay-with-balance',
  PAY_WITH_FIAT: 'pay-with-fiat',
  PAY_WITH_SYMBOL: 'pay-with-symbol',
};
