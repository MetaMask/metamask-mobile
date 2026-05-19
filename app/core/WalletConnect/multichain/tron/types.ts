import type { TrxMethod } from '@metamask/keyring-api';

import type { SnapMappedRequest } from '../types';

/**
 * The Tron snap package does not publish TypeScript declarations. The
 * canonical keyring methods are exposed by `@metamask/keyring-api`, but the
 * WalletConnect method names and dapp payload shapes are local to this bridge.
 */

/** WalletConnect JSON-RPC method names supported by the Tron bridge. */
export type TronWalletConnectMethod =
  | 'tron_signMessage'
  | 'tron_signTransaction'
  | 'tron_sendTransaction'
  | 'tron_getBalance';

/** Canonical keyring methods exposed by the shared keyring API for Tron. */
type TronSnapKeyringMethod = TrxMethod.SignMessage | TrxMethod.SignTransaction;

/** Method names sent to the Tron Snap after WalletConnect normalization. */
export type TronSnapMethod = TronSnapKeyringMethod;

/**
 * Raw WalletConnect request handled by the Tron mapper.
 *
 * The method remains open-ended so unknown future methods can pass through
 * unchanged.
 */
export interface TronWalletConnectRequest<Params = unknown> {
  method: TronWalletConnectMethod | string;
  params: Params;
}

/** WalletConnect params for `tron_signMessage`. */
export interface TronWalletConnectSignMessageParam {
  address?: string;
  message?: string;
}

/** WalletConnect `tron_signMessage` params as either an object or params array. */
export type TronWalletConnectSignMessageParams =
  | TronWalletConnectSignMessageParam
  | TronWalletConnectSignMessageParam[];

/** Minimal TronWeb `raw_data` shape needed to recover the contract type. */
export interface TronWalletConnectRawData {
  contract?: { type?: string }[];
}

/**
 * Minimal transaction shape accepted from Tron WalletConnect dapps.
 *
 * The index signature preserves unknown transaction fields so outbound mapping
 * can reattach a signature to the original dapp-provided transaction object.
 */
export interface TronWalletConnectTransaction {
  raw_data_hex?: string;
  rawDataHex?: string;
  raw_data?: TronWalletConnectRawData;
  type?: string;
  transaction?: TronWalletConnectTransaction;
  tx?: TronWalletConnectTransaction;
  signature?: string[];
  txID?: string;
  [key: string]: unknown;
}

/** WalletConnect params for `tron_signTransaction`. */
export interface TronWalletConnectSignTransactionParam {
  address?: string;
  transaction?: TronWalletConnectTransaction;
  tx?: TronWalletConnectTransaction;
  [key: string]: unknown;
}

/**
 * WalletConnect `tron_signTransaction` params as either an object or params
 * array.
 */
export type TronWalletConnectSignTransactionParams =
  | TronWalletConnectSignTransactionParam
  | TronWalletConnectSignTransactionParam[];

/** Params sent to the Snap for `signMessage`. */
export interface TronSnapSignMessageParams {
  address?: string;
  message?: string;
}

/** Transaction payload sent to the Snap for `signTransaction`. */
export interface TronSnapSignTransaction {
  rawDataHex?: string;
  type?: string;
}

/** Params sent to the Snap for `signTransaction`. */
export interface TronSnapSignTransactionParams {
  address?: string;
  transaction: TronSnapSignTransaction;
}

/** Signature-like result returned by the Snap for transaction signing. */
export interface TronSnapSignatureResult {
  signature?: string | string[];
  txID?: string;
  [key: string]: unknown;
}

/** Union of request shapes returned by the inbound Tron mapper. */
export type TronSnapMappedRequest =
  | (SnapMappedRequest<TronSnapSignMessageParams> & {
      method: 'signMessage';
    })
  | (SnapMappedRequest<TronSnapSignTransactionParams> & {
      method: 'signTransaction';
    })
  | (SnapMappedRequest<unknown> & {
      method: string;
    });
