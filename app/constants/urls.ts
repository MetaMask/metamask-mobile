const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const MOBILE_UTM = '?utm_source=mobile_app';

// Support
export const METAMASK_SUPPORT_URL = `https://support.metamask.io/${MOBILE_UTM}`;
export const SRP_GUIDE_URL = `https://support.metamask.io/getting-started/user-guide-secret-recovery-phrase-password-and-private-keys/${MOBILE_UTM}`;
export const NON_CUSTODIAL_WALLET_URL = `https://support.metamask.io/getting-started/metamask-is-a-self-custodial-wallet/${MOBILE_UTM}`;
export const KEEP_SRP_SAFE_URL = `https://support.metamask.io/privacy-and-security/staying-safe-in-web3/scammers-and-phishers-rugpulls-and-airdrop-scams/${MOBILE_UTM}`;
export const PRIVATE_KEY_GUIDE_URL = `https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/${MOBILE_UTM}#private-keys`;
export const SRP_DOS_AND_DONTS_URL = `https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/${MOBILE_UTM}#metamask-secret-recovery-phrase-dos-and-donts`;
export const IMPORT_WALLET_PRIVATE_KEY_URL = `https://support.metamask.io/start/use-an-existing-wallet/${MOBILE_UTM}#importing-using-a-private-key`;
export const IMPORT_WALLET_GUIDE_URL = `https://support.metamask.io/start/use-an-existing-wallet/${MOBILE_UTM}#import-an-existing-wallet`;
export const RESET_PASSWORD_GUIDE_URL = `https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/${MOBILE_UTM}`;
export const RESET_PASSWORD_SOCIAL_LOGIN_URL = `https://support.metamask.io/configure/wallet/how-can-i-reset-my-password/${MOBILE_UTM}`;
export const PASSWORD_GUIDE_URL = `https://support.metamask.io/configure/wallet/passwords-and-metamask/${MOBILE_UTM}`;
export const LEARN_MORE_URL = `https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/${MOBILE_UTM}`;
export const WHY_TRANSACTION_TAKE_TIME_URL =
  'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172';
export const SIMULATION_DETALS_ARTICLE_URL = `https://support.metamask.io/transactions-and-gas/transactions/simulations/${MOBILE_UTM}`;

export const TOKEN_APPROVAL_SPENDING_CAP = `https://support.metamask.io/privacy-and-security/how-to-customize-token-approvals-with-a-spending-cap/${MOBILE_UTM}`;
export const CONNECTING_TO_A_DECEPTIVE_SITE = `https://support.metamask.io/troubleshooting/deceptive-site-ahead-when-trying-to-connect-to-a-site/${MOBILE_UTM}`;

export const CONNECTING_TO_DEPRECATED_NETWORK = `https://support.metamask.io/networks-and-sidechains/eth-on-testnets/${MOBILE_UTM}`;

export const HOWTO_MANAGE_METAMETRICS = `https://support.metamask.io/configure/privacy/how-to-manage-your-metametrics-settings/${MOBILE_UTM}`;

// Privacy & Security
export const PROFILE_SYNC_URL = `https://support.metamask.io/privacy-and-security/profile-privacy/${MOBILE_UTM}`;
export const PRIVACY_BEST_PRACTICES_URL = `https://support.metamask.io/privacy-and-security/privacy-best-practices/${MOBILE_UTM}`;
export const SECURITY_ALERTS_URL = `https://support.metamask.io/privacy-and-security/how-to-turn-on-security-alerts/${MOBILE_UTM}`;

// Transactions
export const SPEEDUP_CANCEL_TRANSACTION_URL = `https://support.metamask.io/transactions-and-gas/transactions/how-to-speed-up-or-cancel-a-pending-transaction/${MOBILE_UTM}`;
export const SMART_TXS_URL = `https://support.metamask.io/transactions-and-gas/transactions/smart-transactions/${MOBILE_UTM}`;
export const HIGH_GAS_FEES_URL = `https://support.metamask.io/transactions-and-gas/gas-fees/why-are-my-gas-fees-so-high/${MOBILE_UTM}`;

// Accounts
export const SMART_ACCOUNTS_URL = `https://support.metamask.io/configure/accounts/what-is-a-smart-account/${MOBILE_UTM}#what-are-metamask-smart-accounts`;
export const ADD_SOLANA_ACCOUNT_PRIVACY_POLICY_URL = `https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/${MOBILE_UTM}#solana-accounts`;
export const MULTICHAIN_ACCOUNTS_URL = `https://support.metamask.io/configure/accounts/multichain-accounts/${MOBILE_UTM}`;

// Tokens & Swaps
export const MUSD_LEARN_MORE_URL = `https://support.metamask.io/manage-crypto/tokens/musd${MOBILE_UTM}`;
export const MISSING_TOKENS_URL = `https://support.metamask.io/managing-my-tokens/custom-tokens/how-to-display-tokens-in-metamask/${MOBILE_UTM}`;
export const SWAP_ISSUES_URL = `https://support.metamask.io/token-swaps/error-fetching-quote/${MOBILE_UTM}`;

// Staking & Earn
export const POOLED_STAKING_FAQ_URL = `https://support.metamask.io/metamask-portfolio/move-crypto/stake/staking-pool/${MOBILE_UTM}`;
export const TRON_STAKING_FAQ_URL = `https://support.metamask.io/metamask-portfolio/move-crypto/stake/${MOBILE_UTM}`;
export const LENDING_FAQ_URL = `https://support.metamask.io/manage-crypto/earn/lending/${MOBILE_UTM}`;

// Rewards
export const REWARDS_LEARN_MORE_URL = `https://support.metamask.io/manage-crypto/metamask-rewards/${MOBILE_UTM}`;

// Perps
export const PERPS_LEARN_MORE_URL = `https://support.metamask.io/manage-crypto/trade/perps/${MOBILE_UTM}`;
export const PERPS_ADL_URL = `https://support.metamask.io/manage-crypto/trade/perps/leverage-and-liquidation/${MOBILE_UTM}#what-is-auto-deleveraging-adl`;

// Troubleshooting
export const CONNECTIVITY_ISSUES_URL = `https://support.metamask.io/troubleshooting/why-infura-cannot-serve-certain-areas/${MOBILE_UTM}`;
export const TOKEN_BALANCE_URL = `https://support.metamask.io/troubleshooting/what-to-do-when-your-balance-of-tokens-is-incorrect/${MOBILE_UTM}`;
export const TESTNET_ETH_SCAMS_URL = `https://support.metamask.io/privacy-and-security/staying-safe-in-web3/testnet-eth-scams/${MOBILE_UTM}`;

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

// Canonical base values — imported by AppConstants.ts to avoid duplication
export const MM_UNIVERSAL_LINK_HOST = 'metamask.app.link';
export const MM_ANDROID_BUNDLE_ID = 'io.metamask';

export const MM_PLAY_STORE_LINK = `market://details?id=${MM_ANDROID_BUNDLE_ID}`;

// SDK
export const MM_SDK_DEEPLINK = `https://${MM_UNIVERSAL_LINK_HOST}/connect?`;

// WalletConnect
export const MM_WALLETCONNECT_DEEPLINK = `https://${MM_UNIVERSAL_LINK_HOST}/wc?`;

export const FALSE_POSITIVE_REPORT_BASE_URL =
  'https://blockaid-false-positive-portal.metamask.io';
export const UTM_SOURCE = 'metamask-ppom';

export const SEPOLIA_FAUCET = 'https://www.infura.io/faucet/sepolia';
export const LINEA_FAUCET = 'https://www.infura.io/faucet/linea';

// Add custom network
export const ADD_CUSTOM_NETWORK_ARTCILE = `https://support.metamask.io/networks-and-sidechains/managing-networks/verifying-custom-network-information/${MOBILE_UTM}`;
export const CUSTOM_NETWORKS_GUIDE_URL = `https://support.metamask.io/networks-and-sidechains/managing-networks/user-guide-custom-networks-and-sidechains/${MOBILE_UTM}`;
export const UNKNOWN_NETWORK_RISKS_URL = `https://support.metamask.io/networks-and-sidechains/managing-networks/the-risks-of-connecting-to-an-unknown-network/${MOBILE_UTM}`;

export const LEDGER_SUPPORT_LINK =
  'https://support.ledger.com/article/16748796611613-zd';

export const GOERLI_DEPRECATED_ARTICLE =
  'https://github.com/eth-clients/goerli#goerli-goerlitzer-testnet';

export const ETHEREUM_LOGO =
  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg';

export const HOW_TO_MANAGE_METRAMETRICS_SETTINGS = `https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings/${MOBILE_UTM}`;
export const UNSUPPORTED_BUY_REGION_SUPPORT_URL = `https://support.metamask.io/metamask-portfolio/buy/my-country-region-isnt-supported-for-buying-crypto/${MOBILE_UTM}`;
