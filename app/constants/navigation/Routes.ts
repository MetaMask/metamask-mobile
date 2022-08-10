const Routes = {
  BROWSER_TAB_HOME: 'BrowserTabHome',
  BROWSER_URL_MODAL: 'BrowserUrlModal',
  BROWSER_VIEW: 'BrowserView',
  FIAT_ON_RAMP_AGGREGATOR: {
    ID: 'FiatOnRampAggregator',
    GET_STARTED: 'GetStarted',
    PAYMENT_METHOD: 'PaymentMethod',
    AMOUNT_TO_BUY: 'AmountToBuy',
    AMOUNT_TO_BUY_HAS_STARTED: 'AmountToBuyHasStarted',
    GET_QUOTES: 'GetQuotes',
    CHECKOUT: 'Checkout',
    REGION: 'Region',
    REGION_HAS_STARTED: 'RegionHasStarted',
    ORDER_DETAILS: 'OrderDetails',
  },
  LEDGER_CONNECT_FLOW: {
    ID: 'LedgerConnectFlow',
    LEDGER_CONNECT: 'LedgerConnect',
  },
  LEDGER_MESSAGE_SIGN_MODAL: 'LedgerMessageSignModal',
  LEDGER_TRANSACTION_MODAL: 'LedgerTransactionModal',
  MODAL: {
    DELETE_WALLET: 'DeleteWalletModal',
    ROOT_MODAL_FLOW: 'RootModalFlow',
    MODAL_CONFIRMATION: 'ModalConfirmation',
    WHATS_NEW: 'WhatsNewModal',
  },
  ONBOARDING: {
    ROOT_NAV: 'OnboardingRootNav',
    HOME_NAV: 'HomeNav',
    ONBOARDING: 'Onboarding',
    LOGIN: 'Login',
    NAV: 'OnboardingNav',
  },
};

export default Routes;
