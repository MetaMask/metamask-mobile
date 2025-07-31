// Please do not add any more items to this list.
// This list is temporary and the goal is to reduce it to 0, meaning all requests are mocked in our e2e tests.

export const ALLOWLISTED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '10.0.2.2', // Android emulator host
  'api.tenderly.co',
  'rpc.tenderly.co',
];

export const ALLOWLISTED_URLS = [
  // Temporarily allow existing live requests during migration
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
  'https://staking.api.cx.metamask.io/v1/lending/1/markets',
  'https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/1?accounts=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  'https://staking.api.cx.metamask.io/v1/pooled-staking/eligibility?addresses=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1',
  'https://staking.api.cx.metamask.io/v1/lending/markets',
  'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys?days=365&order=desc',
  'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys/averages',
  'https://staking.api.cx.metamask.io/v1/lending/positions/0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  'https://mainnet.infura.io/v3/8f4bc0ed77aa4a2c886a4d929754f414',
  'https://min-api.cryptocompare.com/data/pricemulti?fsyms=btc%2Csol&tsyms=usd',
  'https://pulse.walletconnect.org/batch?projectId=e698cc28a9e75eb175ae3c991ac7eb2a&st=events_sdk&sv=js-2.19.2&sp=desktop',
  'https://clients3.google.com/generate_204',
  'https://security-alerts.api.cx.metamask.io/validate/0x539',
];
