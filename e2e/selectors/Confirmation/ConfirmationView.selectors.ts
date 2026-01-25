import { ApprovalType } from '@metamask/controller-utils';
import enContent from '../../../locales/languages/en.json';

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
  FROM_TO: 'from-to',
  GAS_FEES_DETAILS: 'gas-fees-details',
  MESSAGE: 'message',
  NETWORK: 'network',
  ORIGIN_INFO: 'origin-info',
  SIMULATION_DETAILS: 'simulation-details',
  SIWE_SIGNING_ACCOUNT_INFO: 'siwe-signing-account-info',
  STAKING_DETAILS: 'staking-details',
  TOKEN_HERO: 'token-hero',
  PAID_BY_METAMASK: 'paid-by-metamask',
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
  ALERT_MODAL_GOT_IT_BUTTON: 'alert-modal-acknowledge-button',
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
