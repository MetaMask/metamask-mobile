import type { SnapMappedRequest } from '../types';

/**
 * A Tron address in Base58Check format, starting with 'T'.
 */
export type TronAddress = `T${string}`;

/**
 * Canonical Snap params for `signMessage`.
 */
export interface TronSnapSignMessageParams {
  address: TronAddress;
  /**
   * Base64-encoded message. The Snap base64-decodes it before signing.
   */
  message: string;
}

/**
 * Canonical Snap params for `signTransaction`.
 */
export interface TronSnapSignTransactionParams {
  address: TronAddress;
  transaction: {
    rawDataHex: string;
    type: string;
  };
}

/**
 * WalletConnect JSON-RPC method names supported by the Tron bridge.
 */
export type TronWalletConnectMethod =
  | 'tron_signMessage'
  | 'tron_signTransaction';

/**
 * Raw WalletConnect request handled by the Tron mapper.
 */
export interface TronWalletConnectRequest<Params = unknown> {
  method: TronWalletConnectMethod | string;
  params: Params;
}

/**
 * WalletConnect params for `tron_signMessage`.
 */
export interface TronWalletConnectSignMessageParams {
  address?: string;
  message?: string;
}

/**
 * Minimal TronWeb `raw_data` shape needed to recover the contract type.
 */
export interface TronWalletConnectRawData {
  contract?: { type?: string }[];
}

/**
 * Minimal transaction shape accepted from Tron WalletConnect dapps.
 */
export interface TronWalletConnectTransaction {
  raw_data_hex?: string;
  raw_data?: TronWalletConnectRawData;
  transaction?: TronWalletConnectTransaction;
  [key: string]: unknown;
}

/**
 * WalletConnect params for `tron_signTransaction`.
 */
export interface TronWalletConnectSignTransactionParams {
  address?: string;
  transaction?: TronWalletConnectTransaction;
  [key: string]: unknown;
}

/**
 * Signature result from the Tron Snap. Always a single hex-encoded
 * signature for both `signMessage` and `signTransaction`.
 */
export interface TronSnapSignatureResult {
  signature?: string;
}

/**
 * Union of request shapes returned by the inbound Tron mapper.
 */
export type TronSnapMappedRequest =
  | (SnapMappedRequest<Partial<TronSnapSignMessageParams>> & {
      method: 'signMessage';
    })
  | (SnapMappedRequest<{
      address?: TronSnapSignTransactionParams['address'];
      transaction: Partial<TronSnapSignTransactionParams['transaction']>;
    }> & {
      method: 'signTransaction';
    });
