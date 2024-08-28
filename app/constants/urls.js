"use strict";
exports.__esModule = true;
exports.HOW_TO_MANAGE_METRAMETRICS_SETTINGS = exports.ETHEREUM_LOGO = exports.GOERLI_DEPRECATED_ARTICLE = exports.LEDGER_SUPPORT_LINK = exports.ADD_CUSTOM_NETWORK_ARTCILE = exports.LINEA_FAUCET = exports.SEPOLIA_FAUCET = exports.UTM_SOURCE = exports.FALSE_POSITIVE_REPORT_BASE_URL = exports.MM_SDK_DEEPLINK = exports.MM_PLAY_STORE_LINK = exports.MM_APP_STORE_LINK = exports.MM_DEPRECATED_NETWORKS = exports.MM_APP_CONFIG_TEST_URL = exports.MM_APP_CONFIG_URL = exports.PHISHFORT_BLOCKLIST_ISSUE_URL = exports.MM_BLOCKLIST_ISSUE_URL = exports.MM_PHISH_DETECT_URL = exports.LINEA_DEFAULT_RPC_URL = exports.MAINNET_DEFAULT_RPC_URL = exports.LINEA_MAINNET_BLOCK_EXPLORER = exports.LINEA_SEPOLIA_BLOCK_EXPLORER = exports.LINEA_GOERLI_BLOCK_EXPLORER = exports.MM_ETHERSCAN_URL = exports.CHAINLIST_URL = exports.NGRAVE_BUY = exports.NGRAVE_LEARN_MORE = exports.KEYSTONE_SUPPORT_VIDEO = exports.KEYSTONE_LEARN_MORE = exports.KEYSTONE_SUPPORT = exports.SES_URL = exports.CONSENSYS_PRIVACY_POLICY = exports.HOWTO_MANAGE_METAMETRICS = exports.CONNECTING_TO_DEPRECATED_NETWORK = exports.CONNECTING_TO_A_DECEPTIVE_SITE = exports.TOKEN_APPROVAL_SPENDING_CAP = exports.SIMULATION_DETALS_ARTICLE_URL = exports.WHY_TRANSACTION_TAKE_TIME_URL = exports.LEARN_MORE_URL = exports.KEEP_SRP_SAFE_URL = exports.NON_CUSTODIAL_WALLET_URL = exports.SRP_GUIDE_URL = void 0;
var AppConstants_1 = require("../core/AppConstants");
var InfuraKey = process.env.MM_INFURA_PROJECT_ID;
var infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;
// Support
exports.SRP_GUIDE_URL = 'https://support.metamask.io/getting-started/user-guide-secret-recovery-phrase-password-and-private-keys/';
exports.NON_CUSTODIAL_WALLET_URL = 'https://support.metamask.io/getting-started/metamask-is-a-self-custodial-wallet/';
exports.KEEP_SRP_SAFE_URL = 'https://support.metamask.io/privacy-and-security/staying-safe-in-web3/scammers-and-phishers-rugpulls-and-airdrop-scams/';
exports.LEARN_MORE_URL = 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/';
exports.WHY_TRANSACTION_TAKE_TIME_URL = 'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172';
exports.SIMULATION_DETALS_ARTICLE_URL = 'https://support.metamask.io/transactions-and-gas/transactions/simulations/';
exports.TOKEN_APPROVAL_SPENDING_CAP = "https://support.metamask.io/privacy-and-security/how-to-customize-token-approvals-with-a-spending-cap/";
exports.CONNECTING_TO_A_DECEPTIVE_SITE = 'https://support.metamask.io/troubleshooting/deceptive-site-ahead-when-trying-to-connect-to-a-site/';
exports.CONNECTING_TO_DEPRECATED_NETWORK = 'https://support.metamask.io/networks-and-sidechains/eth-on-testnets/';
exports.HOWTO_MANAGE_METAMETRICS = 'https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings';
// Policies
exports.CONSENSYS_PRIVACY_POLICY = 'https://consensys.net/privacy-policy/';
// SES
exports.SES_URL = 'https://github.com/endojs/endo/blob/master/packages/ses/README.md';
// Keystone
exports.KEYSTONE_SUPPORT = 'https://keyst.one/mmm';
exports.KEYSTONE_LEARN_MORE = 'https://keyst.one/metamask?rfsn=6088257.656b3e9&utm_source=refersion&utm_medium=affiliate&utm_campaign=6088257.656b3e9';
exports.KEYSTONE_SUPPORT_VIDEO = 'https://keyst.one/mmmvideo';
//NGRAVE
exports.NGRAVE_LEARN_MORE = 'https://ngrave.io/zero';
exports.NGRAVE_BUY = 'https://shop.ngrave.io/';
// Network
exports.CHAINLIST_URL = 'https://chainlist.wtf';
exports.MM_ETHERSCAN_URL = 'https://etherscamdb.info/domain/meta-mask.com';
exports.LINEA_GOERLI_BLOCK_EXPLORER = 'https://goerli.lineascan.build';
exports.LINEA_SEPOLIA_BLOCK_EXPLORER = 'https://sepolia.lineascan.build';
exports.LINEA_MAINNET_BLOCK_EXPLORER = 'https://lineascan.build';
// Rpcs
exports.MAINNET_DEFAULT_RPC_URL = "https://mainnet.infura.io/v3/".concat(infuraProjectId);
exports.LINEA_DEFAULT_RPC_URL = "https://linea-mainnet.infura.io/v3/".concat(infuraProjectId);
// Phishing
exports.MM_PHISH_DETECT_URL = 'https://github.com/metamask/eth-phishing-detect';
exports.MM_BLOCKLIST_ISSUE_URL = 'https://github.com/metamask/eth-phishing-detect/issues/new';
exports.PHISHFORT_BLOCKLIST_ISSUE_URL = 'https://github.com/phishfort/phishfort-lists/issues/new';
// https://github.com/MetaMask/metamask-mobile/tree/gh-pages
exports.MM_APP_CONFIG_URL = 'https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json';
exports.MM_APP_CONFIG_TEST_URL = 'https://metamask.github.io/metamask-mobile/AppConfig/test/MockAppConfig.json';
exports.MM_DEPRECATED_NETWORKS = 'https://blog.ethereum.org/2022/06/21/testnet-deprecation/';
exports.MM_APP_STORE_LINK = 'itms-apps://apps.apple.com/app/metamask-blockchain-wallet/id1438144202';
exports.MM_PLAY_STORE_LINK = "market://details?id=".concat(AppConstants_1["default"].BUNDLE_IDS.ANDROID);
// SDK
exports.MM_SDK_DEEPLINK = "https://".concat(AppConstants_1["default"].MM_UNIVERSAL_LINK_HOST, "/connect?");
exports.FALSE_POSITIVE_REPORT_BASE_URL = 'https://blockaid-false-positive-portal.metamask.io';
exports.UTM_SOURCE = 'metamask-ppom';
exports.SEPOLIA_FAUCET = 'https://www.infura.io/faucet/sepolia';
exports.LINEA_FAUCET = 'https://www.infura.io/faucet/linea';
// Add custom network
exports.ADD_CUSTOM_NETWORK_ARTCILE = 'https://support.metamask.io/networks-and-sidechains/managing-networks/verifying-custom-network-information/';
exports.LEDGER_SUPPORT_LINK = 'https://support.ledger.com/hc/en-us/articles/360009576554-Ethereum-ETH-?docs=true';
exports.GOERLI_DEPRECATED_ARTICLE = 'https://github.com/eth-clients/goerli#goerli-goerlitzer-testnet';
exports.ETHEREUM_LOGO = 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg';
exports.HOW_TO_MANAGE_METRAMETRICS_SETTINGS = 'https://support.metamask.io/privacy-and-security/how-to-manage-your-metametrics-settings';
