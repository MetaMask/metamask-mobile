import enContent from '../../../locales/languages/en.json';

export const WalletViewSelectorsIDs = {
  WALLET_CONTAINER: 'wallet-screen',
  NETWORK_NAME: 'network-name',
  NFT_CONTAINER: 'collectible-name',
  WALLET_SCAN_BUTTON: 'wallet-scan-button',
  WALLET_NOTIFICATIONS_BUTTON: 'wallet-notifications-button',
  WALLET_TOKEN_DETECTION_LINK_BUTTON: 'wallet-token-detection-link-button',
  PORTFOLIO_BUTTON: 'portfolio-button',
};

export const WalletViewSelectorsText = {
  IMPORT_TOKENS: `${enContent.wallet.no_available_tokens} ${enContent.wallet.add_tokens}`,
  NFTS_TAB: enContent.wallet.collectibles,
  TOKENS_TAB: enContent.wallet.tokens,
  HIDE_TOKENS: enContent.wallet.remove,
  DEFAULT_TOKEN: 'Ethereum',
};
