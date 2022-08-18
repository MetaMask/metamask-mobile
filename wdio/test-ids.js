export const ONBOARDING_CAROUSEL_CONTAINER_ID = 'onboarding-carousel-screen';
export const CAROUSEL_SCREEN_ONE_IMAGE_ID = 'carousel-one-image';
export const CAROUSEL_SCREEN_TWO_IMAGE_ID = 'carousel-two-image';
export const CAROUSEL_SCREEN_THREE_IMAGE_ID = 'carousel-three-image';

export const GET_STARTED_BUTTON_ID = 'onboarding-get-started-button';

export const ONBOARDING_SCREEN_CONTAINER_ID = 'onboarding-screen';
export const WALLET_SETUP_SCREEN_CONTAINER_ID = 'onboarding-screen-title';

export const IMPORT_WALLET_BUTTON_ID = 'onboarding-import-button';
export const IMPORT_WALLET_FROM_EXTENSION_BUTTON_ID =
  'onboarding-import-button';

export const CREATE_WALLET_BUTTON_ID = 'create-wallet-button';
export const REMEMBER_ME_ID = 'remember-me-toggle';

export const CREATE_PASSWORD_BUTTON_ID = 'create-password-button';

export const PROTECT_YOUR_WALLET_CONTAINER_ID = 'protect-your-account-screen';
export const REMIND_ME_LATER_BUTTON_ID = 'remind-me-later-button';

export const METAMETRICS_OPT_IN_CONTAINER_ID = 'metaMetrics-OptIn';
export const AGREE_BUTTON_ID = 'agree-button';
export const NO_THANKS_BUTTON_ID = 'cancel-button';

export const SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID = 'skip-backup-modal';
export const iOS_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID =
  'ios-skip-account-security-backup';
export const ANDROID_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID =
  'android-skip-account-security-backup';
export const SKIP_ACCOUNT_SECURITY_BUTTON_ID = 'skip-backup-button';

export const DELETE_WALLET_CONTAINER_ID = 'delete-wallet-modal-container';
export const DELETE_WALLET_INPUT_BOX_ID = 'delete-wallet-inputbox';

export const LOGIN_CONTAINER_ID = 'login';
export const PASSWORD_INPUT_BOX_ID = 'login-password-input';
export const LOGIN_PASSWORD_ERROR = 'invalid-password-error';
export const RESET_WALLET_ID = 'reset-wallet-button';

export const ACCOUNT_APROVAL_MODAL_CONTAINER_ID =
  'account-approval-modal-container';
export const CANCEL_BUTTON_ID = 'connect-cancel-button';
export const CONNECT_BUTTON_ID = 'connect-approve-button';

export const ADD_ADDRESS_MODAL_CONTAINER_ID = 'add-address-modal';
export const ENTER_ALIAS_INPUT_BOX_ID = 'address-alias-input';

export const NETWORK_LIST_MODAL_CONTAINER_ID = 'networks-list';
export const OTHER_NETWORK_LIST_ID = 'other-network-name';
export const NETWORK_SCROLL_ID = 'other-networks-scroll';

export const NETWORK_EDUCATION_MODAL_CONTAINER_ID = 'network-education-modal';
export const NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID =
  'network-education-modal-close-button';
export const NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID =
  'network-education-modal-network-name';

export const CREATE_PASSWORD_CONTAINER_ID = 'create-password-screen';
export const CREATE_PASSWORD_INPUT_BOX_ID = 'create-password-first-input-field';
export const CONFIRM_PASSWORD_INPUT_BOX_ID =
  'create-password-second-input-field';

export const CHANGE_PASSWORD_TITLE_ID = 'change-password-section';
export const CHANGE_PASSWORD_BUTTON_ID = 'change-password-button-id';
export const CONFIRM_CHANGE_PASSWORD_INPUT_BOX_ID =
  'private-credential-password-input-field';

export const REVEAL_SECRET_RECOVERY_PHRASE_BUTTON_ID = 'reveal-seed-button';

export const SUBMIT_BUTTON_ID = 'submit-button';
export const BACK_ARROW_BUTTON_ID = 'burger-menu-title-back-arrow-button';

export const IOS_I_UNDERSTAND_BUTTON_ID = 'password-understand-box';
export const ANDROID_I_UNDERSTAND_BUTTON_ID = 'i-understand-text';

export const IMPORT_PASSWORD_CONTAINER_ID = 'import-from-seed-screen';
export const SECRET_RECOVERY_PHRASE_INPUT_BOX_ID = 'input-seed-phrase';

export const BROWSER_URL_MODAL_ID = 'browser-url-modal';
export const APPROVE_NETWORK_MODAL_ID = 'approve-network-modal';
export const APPROVE_NETWORK_APPROVE_BUTTON_ID =
  'approve-network-approve-button';
export const APPROVE_NETWORK_CANCEL_BUTTON_ID = 'approve-network-cancel-button';
export const APPROVE_NETWORK_DISPLAY_NAME_ID =
  'approve-network-display-name-id';

export const REMOVE_NETWORK_ID = 'remove-network-button';
export const ADD_NETWORKS_ID = 'add-network-button';
export const ADD_CUSTOM_RPC_NETWORK_BUTTON_ID = 'add-network-button';
export const RPC_VIEW_CONTAINER_ID = 'new-rpc-screen';

export const NEW_NETWORK_ADDED_CLOSE_BUTTON_ID = 'close-network-button';
export const NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON_ID =
  'switch-to-network-button';

export const WHATS_NEW_MODAL_CONTAINER_ID = 'whats-new-modal-container';
export const WHATS_NEW_MODAL_CLOSE_BUTTON_ID = 'whats-new-modal-close-button';
export const WHATS_NEW_MODAL_GOT_IT_BUTTON_ID = 'whats-new-modal-got-it-button';

export const INPUT_NETWORK_NAME = 'input-network-name';

export const idChange = (id) => {
  return Platform.OS === 'android'
    ? { accessible: true, accessibilityLabel: id }
    : { testID: id };
};

//https://stackoverflow.com/questions/64706072/how-to-set-the-testid-and-the-accessibilitylabel-together-with-react-native
