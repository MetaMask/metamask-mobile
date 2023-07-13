import Device from '../util/device';

const DEVELOPMENT = 'development';

export default {
  IS_DEV: process.env?.NODE_ENV === DEVELOPMENT,
  DEFAULT_LOCK_TIMEOUT: 30000,
  DEFAULT_SEARCH_ENGINE: 'DuckDuckGo',
  TX_CHECK_MAX_FREQUENCY: 5000,
  TX_CHECK_NORMAL_FREQUENCY: 10000,
  TX_CHECK_BACKGROUND_FREQUENCY: 30000,
  IPFS_OVERRIDE_PARAM: 'mm_override',
  IPFS_DEFAULT_GATEWAY_URL: 'https://cloudflare-ipfs.com/ipfs/',
  IPNS_DEFAULT_GATEWAY_URL: 'https://cloudflare-ipfs.com/ipns/',
  SWARM_DEFAULT_GATEWAY_URL: 'https://swarm-gateways.net/bzz:/',
  supportedTLDs: ['eth', 'xyz', 'test'],
  MAX_PUSH_NOTIFICATION_PROMPT_TIMES: 2,
  PORTFOLIO_URL:
    process.env.MM_PORTFOLIO_URL || 'https://portfolio.metamask.io',
  CONNEXT: {
    HUB_EXCHANGE_CEILING_TOKEN: 69,
    MIN_DEPOSIT_ETH: 0.03,
    MAX_DEPOSIT_TOKEN: 30,
    BLOCKED_DEPOSIT_DURATION_MINUTES: 5,
    CONTRACTS: {
      4: '0x0Fa90eC3AC3245112c6955d8F9DD74Ec9D599996',
      1: '0xdfa6edAe2EC0cF1d4A60542422724A48195A5071',
    },
  },
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
  MM_DEEP_ITMS_APP_LINK: 'https://metamask.app.link/skAH3BaF99',
  SAI_ADDRESS: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  HOMEPAGE_URL: process.env.MM_HOMEPAGE || 'https://home.metamask.io/',
  SHORT_HOMEPAGE_URL: 'MetaMask.io',
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  USER_AGENT: Device.isAndroid()
    ? 'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/76.0.3809.123 Mobile/15E148 Safari/605.1',
  NOTIFICATION_NAMES: {
    accountsChanged: 'metamask_accountsChanged',
    unlockStateChanged: 'metamask_unlockStateChanged',
    chainChanged: 'metamask_chainChanged',
  },
  FIAT_ORDERS: {
    POLLING_FREQUENCY: 10000,
  },
  DEEPLINKS: {
    ORIGIN_DEEPLINK: 'deeplink',
    ORIGIN_QR_CODE: 'qr-code',
  },
  WALLET_CONNECT: {
    //One day in hours
    SESSION_LIFETIME: 24,
    LIMIT_SESSIONS: 20,
    DEEPLINK_SESSIONS: 'wc2sessions_deeplink',
    PROJECT_ID: process.env.WALLET_CONNECT_PROJECT_ID,
    METADATA: {
      name: 'MetaMask Wallet',
      description: 'MetaMask Wallet Integration',
      url: 'https://metamask.io/',
      icons: [],
      redirect: {
        native: 'metamask://',
        universal: 'https://metamask.app.link/',
      },
    },
  },
  SWAPS: {
    ACTIVE: true,
    ONLY_MAINNET: true,
    CLIENT_ID: 'mobile',
    LIVENESS_POLLING_FREQUENCY: 5 * 60 * 1000,
    POLL_COUNT_LIMIT: 3,
    DEFAULT_SLIPPAGE: 2,
    CACHE_AGGREGATOR_METADATA_THRESHOLD: 5 * 60 * 1000,
    CACHE_TOKENS_THRESHOLD: 5 * 60 * 1000,
    CACHE_TOP_ASSETS_THRESHOLD: 5 * 60 * 1000,
  },
  MAX_SAFE_CHAIN_ID: 4503599627370476,
  URLS: {
    TERMS_AND_CONDITIONS: 'https://consensys.net/terms-of-use/',
    PRIVACY_POLICY: 'https://consensys.net/privacy-policy/',
    DATA_RETENTION_UPDATE:
      'https://consensys.net/blog/news/consensys-data-retention-update/',
    CONNECTIVITY_ISSUES:
      'https://metamask.zendesk.com/hc/en-us/articles/360059386712',
    NFT: 'https://metamask.zendesk.com/hc/en-us/articles/360058238591-NFT-tokens-in-MetaMask-wallet',
    SECURITY:
      'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-and-Security-Tips-for-MetaMask',
    TOKEN_BALANCE:
      'https://metamask.zendesk.com/hc/en-us/articles/360028059272-What-to-do-when-your-balance-of-ETH-and-or-ERC20-tokens-is-incorrect-inaccurate',
    MM_FAUCET: 'https://faucet.metamask.io/',
    WHY_TRANSACTION_TAKE_TIME:
      'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
    WHAT_IS_ETH_SIGN_AND_WHY_IS_IT_A_RISK:
      'https://support.metamask.io/hc/articles/14764161421467',
  },
  ERRORS: {
    INFURA_BLOCKED_MESSAGE:
      'EthQuery - RPC Error - This service is not available in your country',
  },
  GAS_OPTIONS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    MARKET: 'market',
    AGGRESSIVE: 'aggressive',
  },
  GAS_TIMES: {
    UNKNOWN: 'unknown',
    MAYBE: 'maybe',
    LIKELY: 'likely',
    VERY_LIKELY: 'very_likely',
    AT_LEAST: 'at_least',
    LESS_THAN: 'less_than',
    RANGE: 'range',
  },
  REVIEW_PROMPT: {
    HIGH_GAS_FEES:
      'https://metamask.zendesk.com/hc/en-us/articles/360058751211-Why-my-gas-fees-are-so-high',
    MISSING_TOKENS:
      'https://metamask.zendesk.com/hc/en-us/articles/360015489031-How-to-add-unlisted-tokens-custom-tokens-in-MetaMask',
    SWAP_ISSUES:
      'https://metamask.zendesk.com/hc/en-us/articles/360060329612-Error-fetching-quote',
    SUPPORT: 'https://support.metamask.io',
  },
  BUNDLE_IDS: {
    IOS: 'io.metamask.MetaMask',
    ANDROID: 'io.metamask',
  },
  LEAST_SUPPORTED_ANDROID_API_LEVEL: 29,
  ADD_CUSTOM_NETWORK_POPULAR_TAB_ID: 'popular-tab',
  ADD_CUSTOM_NETWORK_CUSTOM_TAB_ID: 'custom-tab',
  REQUEST_SOURCES: {
    SDK_REMOTE_CONN: 'MetaMask-SDK-Remote-Conn',
    WC: 'WalletConnect',
    WC2: 'WalletConnectV2',
    IN_APP_BROWSER: 'In-App-Browser',
  },
  MM_SDK: {
    SDK_CONNECTIONS: 'sdkConnections',
    SDK_APPROVEDHOSTS: 'sdkApprovedHosts',
    SERVER_URL:
      process.env.SDK_COMMLAYER_URL ??
      'https://metamask-sdk-socket.metafi.codefi.network/',
    PLATFORM: 'metamask-mobile',
    SDK_REMOTE_ORIGIN: 'MMSDKREMOTE::',
    UNKNOWN_PARAM: 'UNKNOWN',
  },
  CANCEL_RATE: 'Transactions (Cancel)',
  SPEED_UP_RATE: 'Transactions (Speed Up)',
  NETWORK_STATE_CHANGE_EVENT: 'NetworkController:stateChange',
  ETH_SIGN_ERROR: 'eth_sign requires 32 byte message hash',
  TERMS_OF_USE: {
    TERMS_DISPLAYED: 'ToU Displayed',
    TERMS_ACCEPTED: 'ToU Accepted',
    TERMS_OF_USE_URL_WITHOUT_COOKIES:
      'https://consensys.net/terms-of-use?standalone=true',
  },
};
