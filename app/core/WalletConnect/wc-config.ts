import { KnownCaipNamespace } from '@metamask/utils';

/**
 * Methods that require redirecting the user back to the dApp after confirmation
 * (signing, sending transactions). Keyed by CAIP-2 namespace.
 * To add a new chain, add a flag-guarded entry below.
 */
export const REDIRECT_METHODS_BY_NAMESPACE: Record<string, string[]> = {
  [KnownCaipNamespace.Eip155]: [
    'eth_requestAccounts',
    'eth_sendTransaction',
    'eth_signTransaction',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'wallet_watchAsset',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_sendCalls',
  ],
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  [KnownCaipNamespace.Tron]: ['tron_signTransaction', 'tron_signMessage'],
  ///: END:ONLY_INCLUDE_IF
};

/**
 * Supported WalletConnect methods keyed by CAIP-2 namespace.
 * To add a new chain, add a flag-guarded entry below.
 */
export const APPROVED_METHODS_BY_NAMESPACE: Record<string, string[]> = {
  [KnownCaipNamespace.Eip155]: [
    // Standard JSON-RPC methods
    'eth_sendTransaction',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'personal_sign',
    'eth_sendRawTransaction',
    'eth_accounts',
    'eth_getBalance',
    'eth_call',
    'eth_estimateGas',
    'eth_blockNumber',
    'eth_getCode',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getTransactionByHash',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',
    'net_version',
    'eth_chainId',
    'eth_requestAccounts',
    // MetaMask specific methods
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_watchAsset',
    'wallet_scanQRCode',
    // EIP-5792 methods
    'wallet_sendCalls',
    'wallet_getCallsStatus',
    'wallet_getCapabilities',
  ],
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  // tron_sendTransaction and tron_getBalance are optional per WalletConnect spec —
  // dApps call Tron nodes directly for broadcast and balance queries.
  [KnownCaipNamespace.Tron]: ['tron_signTransaction', 'tron_signMessage'],
  ///: END:ONLY_INCLUDE_IF
};
