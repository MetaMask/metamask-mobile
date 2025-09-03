import AppConstants from '../core/AppConstants';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

// Support
export const SRP_GUIDE_URL =
  'https://support.metamask.io/getting-started/user-guide-secret-recovery-phrase-password-and-private-keys/';
export const NON_CUSTODIAL_WALLET_URL =
  'https://support.metamask.io/getting-started/metamask-is-a-self-custodial-wallet/';
export const KEEP_SRP_SAFE_URL =
  'https://support.metamask.io/privacy-and-security/staying-safe-in-web3/scammers-and-phishers-rugpulls-and-airdrop-scams/';
export const LEARN_MORE_URL =
  'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/';
export const WHY_TRANSACTION_TAKE_TIME_URL =
  'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172';
export const SIMULATION_DETALS_ARTICLE_URL =
  'https://support.metamask.io/transactions-and-gas/transactions/simulations/';

export const TOKEN_APPROVAL_SPENDING_CAP = `https://support.metamask.io/privacy-and-security/how-to-customize-token-approvals-with-a-spending-cap/`;
export const CONNECTING_TO_A_DECEPTIVE_SITE =
  'https://support.metamask.io/troubleshooting/deceptive-site-ahead-when-trying-to-connect-to-a-site/';

export const CONNECTING_TO_DEPRECATED_NETWORK =
  'https://support.metamask.io/networks-and-sidechains/eth-on-testnets/';

export const HOWTO_MANAGE_METAMETRICS =
  'https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings';

// Policies
export const CONSENSYS_PRIVACY_POLICY = 'https://consensys.net/privacy-policy/';

// Keystone
export const KEYSTONE_SUPPORT = 'https://keyst.one/mmm';
export const KEYSTONE_LEARN_MORE =
  'https://keyst.one/metamask?rfsn=6088257.656b3e9&utm_source=refersion&utm_medium=affiliate&utm_campaign=6088257.656b3e9';
export const KEYSTONE_SUPPORT_VIDEO = 'https://keyst.one/mmmvideo';

//NGRAVE
export const NGRAVE_LEARN_MORE = 'https://ngrave.io/zero';
export const NGRAVE_BUY = 'https://shop.ngrave.io/';

// Network
export const CHAINLIST_URL = 'https://chainlist.wtf';
export const MM_ETHERSCAN_URL = 'https://etherscamdb.info/domain/meta-mask.com';
export const LINEA_GOERLI_BLOCK_EXPLORER = 'https://goerli.lineascan.build';
export const LINEA_SEPOLIA_BLOCK_EXPLORER = 'https://sepolia.lineascan.build';
export const LINEA_MAINNET_BLOCK_EXPLORER = 'https://lineascan.build';
export const MAINNET_BLOCK_EXPLORER = 'https://etherscan.io';
export const SEPOLIA_BLOCK_EXPLORER = 'https://sepolia.etherscan.io';
export const BASE_MAINNET_BLOCK_EXPLORER = 'https://basescan.org';

// Rpcs
export const MAINNET_DEFAULT_RPC_URL = `https://mainnet.infura.io/v3/${infuraProjectId}`;
export const LINEA_DEFAULT_RPC_URL = `https://linea-mainnet.infura.io/v3/${infuraProjectId}`;

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

// WalletConnect
export const MM_WALLETCONNECT_DEEPLINK = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/wc?`;

export const FALSE_POSITIVE_REPORT_BASE_URL =
  'https://blockaid-false-positive-portal.metamask.io';
export const UTM_SOURCE = 'metamask-ppom';

export const SEPOLIA_FAUCET = 'https://www.infura.io/faucet/sepolia';
export const LINEA_FAUCET = 'https://www.infura.io/faucet/linea';

// Add custom network
export const ADD_CUSTOM_NETWORK_ARTCILE =
  'https://support.metamask.io/networks-and-sidechains/managing-networks/verifying-custom-network-information/';

export const LEDGER_SUPPORT_LINK =
  'https://support.ledger.com/hc/en-us/articles/360009576554-Ethereum-ETH-?docs=true';

export const GOERLI_DEPRECATED_ARTICLE =
  'https://github.com/eth-clients/goerli#goerli-goerlitzer-testnet';

export const ETHEREUM_LOGO =
  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg';

export const HOW_TO_MANAGE_METRAMETRICS_SETTINGS =
  'https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings';

export const SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE =
  'https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/#solana-accounts';
