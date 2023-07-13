import AppConstants from '../core/AppConstants';

// Support
export const SRP_GUIDE_URL =
  'https://metamask.zendesk.com/hc/en-us/articles/4404722782107-User-guide-Secret-Recovery-Phrase-password-and-private-keys';
export const NON_CUSTODIAL_WALLET_URL =
  'https://metamask.zendesk.com/hc/en-us/articles/360059952212-MetaMask-is-a-non-custodial-wallet';
export const KEEP_SRP_SAFE_URL =
  'https://metamask.zendesk.com/hc/en-us/articles/4407169552667-Scammers-and-Phishers-Rugpulls-and-airdrop-scams';
export const LEARN_MORE_URL =
  'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-and-Security-Tips-for-MetaMask';
export const WHY_TRANSACTION_TAKE_TIME_URL =
  'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172';

export const TOKEN_APPROVAL_SPENDING_CAP = `https://support.metamask.io/hc/en-us/articles/6055177143579-How-to-customize-token-approvals-with-a-spending-cap`;

// Policies
export const CONSENSYS_PRIVACY_POLICY = 'https://consensys.net/privacy-policy/';

// Keystone
export const KEYSTONE_SUPPORT = 'https://keyst.one/mmm';
export const KEYSTONE_LEARN_MORE =
  'https://keyst.one/metamask?rfsn=6088257.656b3e9&utm_source=refersion&utm_medium=affiliate&utm_campaign=6088257.656b3e9';
export const KEYSTONE_SUPPORT_VIDEO = 'https://keyst.one/mmmvideo';

// MixPanel
export const MIXPANEL_ENDPOINT_BASE_URL = 'https://mixpanel.com/api/app';

// Network
export const CHAINLIST_URL = 'https://chainlist.wtf';
export const MM_ETHERSCAN_URL = 'https://etherscamdb.info/domain/meta-mask.com';
export const LINEA_GOERLI_BLOCK_EXPLORER = 'https://goerli.lineascan.build';
export const LINEA_MAINNET_BLOCK_EXPLORER = 'https://lineascan.build';
export const LINEA_MAINNET_RPC_URL = `https://linea-mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
// Phishing
export const MM_PHISH_DETECT_URL =
  'https://github.com/metamask/eth-phishing-detect';
export const MM_BLOCKLIST_ISSUE_URL =
  'https://github.com/metamask/eth-phishing-detect/issues/new';
export const PHISHFORT_BLOCKLIST_ISSUE_URL =
  'https://github.com/phishfort/phishfort-lists/issues/new';

// https://github.com/MetaMask/metamask-mobile/tree/gh-pages
export const MM_APP_CONFIG_URL =
  'https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json';
export const MM_APP_CONFIG_TEST_URL =
  'https://metamask.github.io/metamask-mobile/AppConfig/test/MockAppConfig.json';

export const MM_DEPRECATED_NETWORKS =
  'https://blog.ethereum.org/2022/06/21/testnet-deprecation/';

export const MM_APP_STORE_LINK =
  'itms-apps://apps.apple.com/app/metamask-blockchain-wallet/id1438144202';

export const MM_PLAY_STORE_LINK = `market://details?id=${AppConstants.BUNDLE_IDS.ANDROID}`;

// SDK
export const MM_SDK_DEEPLINK = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/connect?`;
