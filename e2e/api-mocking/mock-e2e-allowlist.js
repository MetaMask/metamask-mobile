// Please do not add any more items to this list.
// This list is temporary and the goal is to reduce it to 0, meaning all requests are mocked in our e2e tests.

export const ALLOWLISTED_HOSTS = [
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  '10.0.2.2', // Android emulator host
  'api.tenderly.co',
  'rpc.tenderly.co',
  'virtual.mainnet.rpc.tenderly.co',
];

export const ALLOWLISTED_URLS = [
  // Temporarily allow existing live requests during migration
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
  'https://staking.api.cx.metamask.io/v1/lending/1/markets',
  'https://staking.api.cx.metamask.io/v1/lending/positions/CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
  'https://min-api.cryptocompare.com/data/pricemulti?fsyms=btc%2Csol&tsyms=usd',
  'https://pulse.walletconnect.org/batch?projectId=e698cc28a9e75eb175ae3c991ac7eb2a&st=events_sdk&sv=js-2.19.2&sp=desktop',
  'https://clients3.google.com/generate_204',
  'https://api.avax.network/ext/bc/C/rpc',
  'https://security-alerts.api.cx.metamask.io/validate/0x539',
  'https://token.api.cx.metamask.io/tokens/1?occurrenceFloor=3&includeNativeAssets=false&includeTokenFees=false&includeAssetType=false&includeERC20Permit=false&includeStorage=false',
  // this should be fixed in code to remove the double slash before transactions, mock without double slash already in the defaults
  'https://accounts.api.cx.metamask.io/v1/accounts/0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3//transactions?networks=0x1,0x89,0x38,0xe708,0x2105,0xa,0xa4b1,0x82750,0x531&sortDirection=DESC',
  // this should be fixed in code to remove the double slash before balances, mock without double slash already in the default mocks
  'https://accounts.api.cx.metamask.io/v2/accounts//balances?networks=1',
];
