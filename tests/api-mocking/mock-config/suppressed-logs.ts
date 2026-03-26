export const SUPPRESSED_LOGS_URLS = [
  /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/favicon\.ico$/,
  // Suppress RPC errors when no local node (Anvil/Ganache) is running.
  // Visual tests and other non-transaction tests don't start a local node,
  // so forwarded RPC requests to port 8546 are expected to fail silently.
  /^http:\/\/(localhost|127\.0\.0\.1):8546\//,
];
