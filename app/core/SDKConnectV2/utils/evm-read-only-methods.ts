// TODO (wenfix): is there a single source of truth available?

// Read-only EVM methods
export const EVM_READ_ONLY_METHODS = [
  // Balance & Account Info
  'eth_getBalance',
  'eth_getCode',
  'eth_getTransactionCount',

  // Block Information
  'eth_blockNumber',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',

  // Transaction Information
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionReceipt',

  // Contract Calls & Estimates
  'eth_call',
  'eth_estimateGas',

  // Storage & State
  'eth_getStorageAt',
  'eth_getProof',

  // Gas & Fees
  'eth_gasPrice',
  'eth_feeHistory',

  // Logs & Filters
  'eth_getLogs',
  'eth_getFilterLogs',
  'eth_getFilterChanges',
  'eth_newFilter',
  'eth_newBlockFilter',
  'eth_newPendingTransactionFilter',
  'eth_uninstallFilter',

  // Network Info
  'eth_chainId',
  'net_version',
  'net_listening',
  'net_peerCount',

  // Protocol Info
  'eth_protocolVersion',
  'eth_syncing',
  'eth_mining',
  'eth_hashrate',
  'eth_coinbase',
  'eth_getWork',

  // Utility
  'web3_sha3',
  'web3_clientVersion',
  'parity_defaultAccount',

  // Permissions (read-only)
  'wallet_getPermissions',
  'wallet_getCallsStatus',
  'wallet_getCapabilities',
];
