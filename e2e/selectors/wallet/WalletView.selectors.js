import enContent from '../../../locales/languages/en.json';

export const WalletViewSelectorsIDs = {
  WALLET_CONTAINER: 'wallet-screen',
  NETWORK_NAME: 'network-name',
  NFT_CONTAINER: 'collectible-name',
  WALLET_SCAN_BUTTON: 'wallet-scan-button',
  WALLET_NOTIFICATIONS_BUTTON: 'wallet-notifications-button',
  WALLET_TOKEN_DETECTION_LINK_BUTTON: 'wallet-token-detection-link-button',
  PORTFOLIO_BUTTON: 'portfolio-button',
  TOTAL_BALANCE_TEXT: 'total-balance-text',
  STAKE_BUTTON: 'stake-button',
  IMPORT_NFT_BUTTON: 'import-collectible-button',
  IMPORT_TOKEN_BUTTON: 'import-token-button',
  NAVBAR_NETWORK_BUTTON: 'open-networks-button',
  NAVBAR_NETWORK_TEXT: 'open-networks-text',
  NFT_TAB_CONTAINER: 'collectible-contracts',
  ACCOUNT_ICON: 'account-picker',
  ACCOUNT_NAME_LABEL_INPUT: 'account-label-text-input',
  ACCOUNT_NAME_LABEL_TEXT: 'account-label',
  TOKENS_CONTAINER: 'tokens',
  ACCOUNT_OVERVIEW: 'account-overview',
  ACCOUNT_ACTIONS: 'main-wallet-account-actions',
  ACCOUNT_COPY_BUTTON: 'wallet-account-copy-button',
  ACCOUNT_ADDRESS: 'wallet-account-address',
};

export const WalletViewSelectorsText = {
  IMPORT_TOKENS: `${enContent.wallet.no_available_tokens} ${enContent.wallet.add_tokens}`,
  NFTS_TAB: enContent.wallet.collectibles,
  TOKENS_TAB: enContent.wallet.tokens,
  HIDE_TOKENS: enContent.wallet.remove,
  DEFAULT_TOKEN: 'Ethereum',
};
