import messages from '../../locales/languages/en.json';

export const WalletViewSelectorsIDs = {
  WALLET_CONTAINER: 'wallet-screen',
  NETWORK_NAME: 'network-name',
  NFT_CONTAINER: 'collectible-name',
  WALLET_SCAN_BUTTON: 'wallet-scan-button',
};

export const WalletViewSelectorsText = {
  IMPORT_TOKENS: `${messages.wallet.no_available_tokens} ${messages.wallet.add_tokens}`,
  NFTS_TAB: messages.wallet.collectibles,
  TOKENS_TAB: messages.wallet.tokens,
  HIDE_TOKENS: messages.wallet.remove,
  DEFAULT_TOKEN: 'Ethereum',
};
