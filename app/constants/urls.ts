import AppConstants from '../core/AppConstants';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

// Support
export const METAMASK_SUPPORT_URL =
  'https://support.metamask.io/?utm_source=mobile_app';
export const SRP_GUIDE_URL =
  'https://support.metamask.io/getting-started/user-guide-secret-recovery-phrase-password-and-private-keys/?utm_source=mobile_app';
export const NON_CUSTODIAL_WALLET_URL =
  'https://support.metamask.io/getting-started/metamask-is-a-self-custodial-wallet/?utm_source=mobile_app';
export const KEEP_SRP_SAFE_URL =
  'https://support.metamask.io/privacy-and-security/staying-safe-in-web3/scammers-and-phishers-rugpulls-and-airdrop-scams/?utm_source=mobile_app';
export const PRIVATE_KEY_GUIDE_URL =
  'https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/?utm_source=mobile_app#private-keys';
export const SRP_DOS_AND_DONTS_URL =
  'https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/?utm_source=mobile_app#metamask-secret-recovery-phrase-dos-and-donts';
export const IMPORT_WALLET_PRIVATE_KEY_URL =
  'https://support.metamask.io/start/use-an-existing-wallet/?utm_source=mobile_app#importing-using-a-private-key';
export const IMPORT_WALLET_GUIDE_URL =
  'https://support.metamask.io/start/use-an-existing-wallet/?utm_source=mobile_app#import-an-existing-wallet';
export const RESET_PASSWORD_GUIDE_URL =
  'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/?utm_source=mobile_app';
export const RESET_PASSWORD_SOCIAL_LOGIN_URL =
  'https://support.metamask.io/configure/wallet/how-can-i-reset-my-password/?utm_source=mobile_app';
export const PASSWORD_GUIDE_URL =
  'https://support.metamask.io/configure/wallet/passwords-and-metamask/?utm_source=mobile_app';
export const LEARN_MORE_URL =
  'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/?utm_source=mobile_app';
export const WHY_TRANSACTION_TAKE_TIME_URL =
  'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172';
export const SIMULATION_DETALS_ARTICLE_URL =
  'https://support.metamask.io/transactions-and-gas/transactions/simulations/?utm_source=mobile_app';

export const TOKEN_APPROVAL_SPENDING_CAP =
  'https://support.metamask.io/privacy-and-security/how-to-customize-token-approvals-with-a-spending-cap/?utm_source=mobile_app';
export const CONNECTING_TO_A_DECEPTIVE_SITE =
  'https://support.metamask.io/troubleshooting/deceptive-site-ahead-when-trying-to-connect-to-a-site/?utm_source=mobile_app';

export const CONNECTING_TO_DEPRECATED_NETWORK =
  'https://support.metamask.io/networks-and-sidechains/eth-on-testnets/?utm_source=mobile_app';

export const HOWTO_MANAGE_METAMETRICS =
  'https://support.metamask.io/configure/privacy/how-to-manage-your-metametrics-settings/?utm_source=mobile_app';

// Privacy & Security
export const PROFILE_SYNC_URL =
  'https://support.metamask.io/privacy-and-security/profile-privacy/?utm_source=mobile_app';
export const PRIVACY_BEST_PRACTICES_URL =
  'https://support.metamask.io/privacy-and-security/privacy-best-practices/?utm_source=mobile_app';
export const SECURITY_ALERTS_URL =
  'https://support.metamask.io/privacy-and-security/how-to-turn-on-security-alerts/?utm_source=mobile_app';

// Transactions
export const SPEEDUP_CANCEL_TRANSACTION_URL =
  'https://support.metamask.io/transactions-and-gas/transactions/how-to-speed-up-or-cancel-a-pending-transaction/?utm_source=mobile_app';
export const SMART_TXS_URL =
  'https://support.metamask.io/transactions-and-gas/transactions/smart-transactions/?utm_source=mobile_app';
export const HIGH_GAS_FEES_URL =
  'https://support.metamask.io/transactions-and-gas/gas-fees/why-are-my-gas-fees-so-high/?utm_source=mobile_app';

// Accounts
export const SMART_ACCOUNTS_URL =
  'https://support.metamask.io/configure/accounts/what-is-a-smart-account/?utm_source=mobile_app#what-are-metamask-smart-accounts';
export const ADD_SOLANA_ACCOUNT_PRIVACY_POLICY_URL =
  'https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/?utm_source=mobile_app#solana-accounts';
export const MULTICHAIN_ACCOUNTS_URL =
  'https://support.metamask.io/configure/accounts/multichain-accounts/?utm_source=mobile_app';

// Tokens & Swaps
export const MUSD_LEARN_MORE_URL =
  'https://support.metamask.io/manage-crypto/tokens/musd?utm_source=mobile_app';
export const MISSING_TOKENS_URL =
  'https://support.metamask.io/managing-my-tokens/custom-tokens/how-to-display-tokens-in-metamask/?utm_source=mobile_app';
export const SWAP_ISSUES_URL =
  'https://support.metamask.io/token-swaps/error-fetching-quote/?utm_source=mobile_app';

// Staking & Earn
export const POOLED_STAKING_FAQ_URL =
  'https://support.metamask.io/metamask-portfolio/move-crypto/stake/staking-pool/?utm_source=mobile_app';
export const TRON_STAKING_FAQ_URL =
  'https://support.metamask.io/metamask-portfolio/move-crypto/stake/?utm_source=mobile_app';
export const LENDING_FAQ_URL =
  'https://support.metamask.io/manage-crypto/earn/lending/?utm_source=mobile_app';

// Rewards
export const REWARDS_LEARN_MORE_URL =
  'https://support.metamask.io/manage-crypto/metamask-rewards/?utm_source=mobile_app';

// Perps
export const PERPS_LEARN_MORE_URL =
  'https://support.metamask.io/manage-crypto/trade/perps/?utm_source=mobile_app';
export const PERPS_ADL_URL =
  'https://support.metamask.io/manage-crypto/trade/perps/leverage-and-liquidation/?utm_source=mobile_app#what-is-auto-deleveraging-adl';

// Troubleshooting
export const CONNECTIVITY_ISSUES_URL =
  'https://support.metamask.io/troubleshooting/why-infura-cannot-serve-certain-areas/?utm_source=mobile_app';
export const TOKEN_BALANCE_URL =
  'https://support.metamask.io/troubleshooting/what-to-do-when-your-balance-of-tokens-is-incorrect/?utm_source=mobile_app';
export const TESTNET_ETH_SCAMS_URL =
  'https://support.metamask.io/privacy-and-security/staying-safe-in-web3/testnet-eth-scams/?utm_source=mobile_app';

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
export const BSC_MAINNET_BLOCK_EXPLORER = 'https://bscscan.com';

// Rpcs
export const MAINNET_DEFAULT_RPC_URL = `https://mainnet.infura.io/v3/${infuraProjectId}`;
export const LINEA_DEFAULT_RPC_URL = `https://linea-mainnet.infura.io/v3/${infuraProjectId}`;

// Phishing
export const MM_PHISH_DETECT_URL =
  'https://github.com/metamask/eth-phishing-detect';
export const MM_BLOCKLIST_ISSUE_URL =
  'https://github.com/metamask/eth-phishing-detect/issues';

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
  'https://support.metamask.io/networks-and-sidechains/managing-networks/verifying-custom-network-information/?utm_source=mobile_app';
export const CUSTOM_NETWORKS_GUIDE_URL =
  'https://support.metamask.io/networks-and-sidechains/managing-networks/user-guide-custom-networks-and-sidechains/?utm_source=mobile_app';
export const UNKNOWN_NETWORK_RISKS_URL =
  'https://support.metamask.io/networks-and-sidechains/managing-networks/the-risks-of-connecting-to-an-unknown-network/?utm_source=mobile_app';

export const LEDGER_SUPPORT_LINK =
  'https://support.ledger.com/article/16748796611613-zd';

export const GOERLI_DEPRECATED_ARTICLE =
  'https://github.com/eth-clients/goerli#goerli-goerlitzer-testnet';

export const ETHEREUM_LOGO =
  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg';

export const HOW_TO_MANAGE_METRAMETRICS_SETTINGS =
  'https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings/?utm_source=mobile_app';
export const UNSUPPORTED_BUY_REGION_SUPPORT_URL =
  'https://support.metamask.io/metamask-portfolio/buy/my-country-region-isnt-supported-for-buying-crypto/?utm_source=mobile_app';
