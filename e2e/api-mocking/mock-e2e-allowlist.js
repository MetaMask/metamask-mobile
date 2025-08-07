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
];
