// List of hosts that should be redirected to localhost:8545 (local blockchain node)
// These are typically blockchain RPC endpoints that we want to redirect to our local test network

export const BLOCKLISTED_HOSTS = [
  // Common blockchain RPC endpoints that should be redirected to local test network
  'mainnet.infura.io',
  'linea-mainnet.infura.io',
  'goerli.infura.io',
  'sepolia.infura.io',
  'polygon-rpc.com',
  'bsc-dataseed.binance.org',
  'rpc.ankr.com',
  'cloudflare-eth.com',
  'eth-mainnet.alchemyapi.io',
  'eth-goerli.alchemyapi.io',
  'polygon-mainnet.g.alchemy.com',
  'bsc-mainnet.nodereal.io',
  // Add more blockchain RPC endpoints as needed
];
