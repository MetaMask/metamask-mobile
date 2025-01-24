import { ApprovalType } from '@metamask/controller-utils';

export const ConfirmationTopSheetSelectorsIDs = {
  SECURITY_ALERT_BANNER: 'security-alert-banner',
  SECURITY_ALERT_RESPONSE_FAILED_BANNER:
    'security-alert-response-failed-banner',
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
  MESSAGE_SECTION: 'message-section',
};
