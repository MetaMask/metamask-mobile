// Please do not add any more items to this list.
// This list is temporary and the goal is to reduce it to 0, meaning all requests are mocked in our e2e tests.

export const ALLOWLISTED_HOSTS = [
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  '10.0.2.2', // Android emulator host
  // Seedless OAuth / Web3Auth UAT — real services (proxy forwards; see shim.js)
  'auth-service.uat-api.cx.metamask.io',
  '*.node.web3auth.io',
  '*.uat-node.web3auth.io',
  'gamma-api.polymarket.com',
  '*.polymarket.com',
  'metamask.github.io', // Test-snaps and test-dapp pages loaded in browser
];

export const ALLOWLISTED_URLS: string[] = [];
