// Please do not add any more items to this list.
// This list is temporary and the goal is to reduce it to 0, meaning all requests are mocked in our e2e tests.

export const ALLOWLISTED_HOSTS = [
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  // BrowserStack Local tunnel hostname for fixture / command-queue servers
  // (same role as localhost — getLocalHost() returns bs-local.com on BS).
  'bs-local.com',
  '10.0.2.2', // Android emulator host
  'metamask.github.io', // Test-snaps and test-dapp pages loaded in browser
];

export const ALLOWLISTED_URLS: string[] = [];
