import { ApprovalType } from '@metamask/controller-utils';
import enContent from '../../../locales/languages/en.json';

export const ConfirmationTopSheetSelectorsIDs = {
  SECURITY_ALERT_BANNER: 'security-alert-banner',
  SECURITY_ALERT_RESPONSE_FAILED_BANNER:
    'security-alert-response-failed-banner',
  SECURITY_ALERT_BANNER_REDESIGNED: 'security-alert-banner-0',
};

export const ConfirmationTopSheetSelectorsText = {
  BANNER_FAILED_TITLE: enContent.blockaid_banner.failed_title,
  BANNER_FAILED_DESCRIPTION: enContent.blockaid_banner.failed_description,
  BANNER_MALICIOUS_TITLE: enContent.blockaid_banner.deceptive_request_title,
  BANNER_MALICIOUS_DESCRIPTION: enContent.blockaid_banner.malicious_domain_description,
};

export const ConfirmationRequestTypeIDs = {
  PERSONAL_SIGN_REQUEST: ApprovalType.PersonalSign,
  TYPED_SIGN_REQUEST: ApprovalType.EthSignTypedData,
};

export const ConfirmationFooterSelectorIDs = {
  CANCEL_BUTTON: 'cancel-button',
  CONFIRM_BUTTON: 'confirm-button',
};

export const ConfirmationPageSectionsSelectorIDs = {
  ACCOUNT_NETWORK_SECTION: 'account-network-section',
  ORIGIN_INFO_SECTION: 'origin-info-section',
  SIWE_SIGNING_ACCOUNT_INFO_SECTION: 'siwe-signing-account-info-section',
  MESSAGE_SECTION: 'message-section',
  STAKING_DETAILS_SECTION: 'staking-details-section',
};
