import { KnownCaipNamespace } from '@metamask/utils';

/**
 * Methods that require redirecting the user back to the dApp after confirmation
 * (signing, sending transactions).
 *
 * Only for EVM, non-EVM chains need to specify methods in their own Adapter implementation.
 */
export const EVM_METHODS_TO_REDIRECT: string[] = [
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
];

/**
 * Supported WalletConnect EVM methods.
 *
 * Only for EVM, non-EVM chains need to specify methods in their own Adapter implementation.
 */
export const EVM_APPROVED_METHODS: string[] = [
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
];
