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
  'virtual.linea.rpc.tenderly.co',
  'gamma-api.polymarket.com',
  '*.polymarket.com',
  'metamask.github.io', // Test-snaps and test-dapp pages loaded in browser
];

export const ALLOWLISTED_URLS: string[] = [];
