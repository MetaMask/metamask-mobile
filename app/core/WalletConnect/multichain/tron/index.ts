export {
  extractTronRawDataHex,
  extractTronType,
  mapRequestInbound,
  mapRequestOutbound,
} from './mapper';

export type {
  TronSnapMappedRequest,
  TronSnapMethod,
  TronSnapSignatureResult,
  TronSnapSignMessageParams,
  TronSnapSignTransaction,
  TronSnapSignTransactionParams,
  TronWalletConnectMethod,
  TronWalletConnectRawData,
  TronWalletConnectRequest,
  TronWalletConnectSignMessageParam,
  TronWalletConnectSignMessageParams,
  TronWalletConnectSignTransactionParam,
  TronWalletConnectSignTransactionParams,
  TronWalletConnectTransaction,
} from './types';

export {
  enrichCaveatValue,
  getScopedPermissions,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeTronAccountIdOutbound,
  tronAdapter,
} from './adapter';
