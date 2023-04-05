const Routes = {
  WALLET_VIEW: 'WalletView',
  BROWSER_TAB_HOME: 'BrowserTabHome',
  BROWSER_URL_MODAL: 'BrowserUrlModal',
  BROWSER_VIEW: 'BrowserView',
  FIAT_ON_RAMP_AGGREGATOR: {
    ID: 'FiatOnRampAggregator',
    GET_STARTED: 'GetStarted',
    PAYMENT_METHOD: 'PaymentMethod',
    PAYMENT_METHOD_HAS_STARTED: 'PaymentMethodHasStarted',
    AMOUNT_TO_BUY: 'AmountToBuy',
    GET_QUOTES: 'GetQuotes',
    CHECKOUT: 'Checkout',
    REGION: 'Region',
    REGION_HAS_STARTED: 'RegionHasStarted',
    ORDER_DETAILS: 'OrderDetails',
    SETTINGS: 'OnRampSettings',
    ADD_ACTIVATION_KEY: 'OnrampAddActivationKey',
  },
  QR_SCANNER: 'QRScanner',
  TRANSACTIONS_VIEW: 'TransactionsView',
  MODAL: {
    DELETE_WALLET: 'DeleteWalletModal',
    ROOT_MODAL_FLOW: 'RootModalFlow',
    MODAL_CONFIRMATION: 'ModalConfirmation',
    MODAL_MANDATORY: 'ModalMandatory',
    WHATS_NEW: 'WhatsNewModal',
    TURN_OFF_REMEMBER_ME: 'TurnOffRememberMeModal',
    UPDATE_NEEDED: 'UpdateNeededModal',
    ENABLE_AUTOMATIC_SECURITY_CHECKS: 'EnableAutomaticSecurityChecksModal',
    DETECTED_TOKENS: 'DetectedTokens',
    SRP_REVEAL_QUIZ: 'SRPRevealQuiz',
    WALLET_ACTIONS: 'WalletActions',
  },
  ONBOARDING: {
    ROOT_NAV: 'OnboardingRootNav',
    HOME_NAV: 'HomeNav',
    ONBOARDING: 'Onboarding',
    LOGIN: 'Login',
    NAV: 'OnboardingNav',
    MANUAL_BACKUP: {
      STEP_3: 'ManualBackupStep3',
    },
    IMPORT_FROM_SECRET_RECOVERY_PHRASE: 'ImportFromSecretRecoveryPhrase',
  },
  SEND_FLOW: {
    SEND_TO: 'SendTo',
  },
  ACCOUNT_BACKUP: {
    STEP_1_B: 'AccountBackupStep1B',
  },
  SETTINGS: {
    CONTACT_FORM: 'ContactForm',
    REVEAL_PRIVATE_CREDENTIAL: 'RevealPrivateCredentialView',
  },
  SHEET: {
    ACCOUNT_SELECTOR: 'AccountSelector',
    SDK_LOADING: 'SDKLoading',
    SDK_FEEDBACK: 'SDKFeedback',
    ACCOUNT_CONNECT: 'AccountConnect',
    ACCOUNT_PERMISSIONS: 'AccountPermissions',
  },
  BROWSER: {
    HOME: 'BrowserTabHome',
    URL_MODAL: 'BrowserUrlModal',
    VIEW: 'BrowserView',
  },
  WEBVIEW: {
    MAIN: 'Webview',
    SIMPLE: 'SimpleWebview',
  },
  WALLET: {
    HOME: 'WalletTabHome',
    TAB_STACK_FLOW: 'WalletTabStackFlow',
  },
  VAULT_RECOVERY: {
    RESTORE_WALLET: 'RestoreWallet',
    WALLET_RESTORED: 'WalletRestored',
    WALLET_RESET_NEEDED: 'WalletResetNeeded',
  },
};

export default Routes;
