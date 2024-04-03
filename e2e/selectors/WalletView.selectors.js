import messages from '../../locales/languages/en.json';

export const WalletViewSelectorsIDs = {
  WALLET_CONTAINER: 'wallet-screen',
  NETWORK_NAME: 'network-name',
  NFT_CONTAINER: 'collectible-name',
  WALLET_SCAN_BUTTON: 'wallet-scan-button',
  SEND_BUTTON_ID: 'token-send-button',
  IMPORT_NFT_BUTTON_ID: 'import-collectible-button',
  IMPORT_TOKEN_BUTTON_ID: 'import-token-button',
  MAIN_WALLET_VIEW_VIA_TOKENS_ID: 'tokens',
  NAVBAR_NETWORK_BUTTON: 'open-networks-button',
  NAVBAR_NETWORK_TEXT: 'open-networks-text',
  WALLET_ACCOUNT_ICON: 'account-picker',
};

export const WalletViewSelectorsText = {
  IMPORT_TOKENS: `${messages.wallet.no_available_tokens} ${messages.wallet.add_tokens}`,
  NFTS_TAB: messages.wallet.collectibles,
  TOKENS_TAB: messages.wallet.tokens,
  HIDE_TOKENS: messages.wallet.remove,
  DEFAULT_TOKEN: 'Ethereum',
};
