import type { SnapMappedRequest } from '../types';

/**
 * Two worlds live in this file:
 *
 * 1. WalletConnect dapp request shapes, as defined by the Reown/WalletConnect
 * Tron RPC spec. The spec exposes two formats — a legacy format that
 * double-wraps the transaction (`transaction.transaction`) and a v1 format
 * that passes it flat. Both use snake_case fields. The mapper handles both
 * via recursion on `transaction`.
 * 2. Tron Snap params. The canonical shapes below mirror the contract
 * declared by `@metamask/tron-wallet-snap`; the Snap is the source of truth
 * and will reject incomplete or malformed requests downstream.
 */

/** A Tron address in Base58Check format, starting with 'T'. */
export type TronAddress = `T${string}`;

/** Canonical Snap params for `signMessage`. */
export interface TronSnapSignMessageParams {
  address: TronAddress;
  /** Base64-encoded message. The Snap base64-decodes it before signing. */
  message: string;
}

/** Canonical Snap params for `signTransaction`. */
export interface TronSnapSignTransactionParams {
  address: TronAddress;
  transaction: {
    rawDataHex: string;
    type: string;
  };
}

/** WalletConnect JSON-RPC method names supported by the Tron bridge. */
export type TronWalletConnectMethod =
  | 'tron_signMessage'
  | 'tron_signTransaction';

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
export interface TronWalletConnectSignMessageParams {
  address?: string;
  message?: string;
}

/** Minimal TronWeb `raw_data` shape needed to recover the contract type. */
export interface TronWalletConnectRawData {
  contract?: { type?: string }[];
}

/**
 * Minimal transaction shape accepted from Tron WalletConnect dapps.
 *
 * The mapper extracts `raw_data_hex` and `raw_data.contract[0].type`. The
 * optional `transaction` field supports the legacy double-wrap format. The
 * index signature preserves unknown fields so the outbound mapper can
 * reattach the signature to the original dapp-provided transaction object.
 */
export interface TronWalletConnectTransaction {
  raw_data_hex?: string;
  raw_data?: TronWalletConnectRawData;
  transaction?: TronWalletConnectTransaction;
  [key: string]: unknown;
}

/** WalletConnect params for `tron_signTransaction`. */
export interface TronWalletConnectSignTransactionParams {
  address?: string;
  transaction?: TronWalletConnectTransaction;
  [key: string]: unknown;
}

/**
 * Signature result returned by the Tron Snap. The Snap always returns a
 * single hex-encoded signature string for both `signMessage` and
 * `signTransaction`.
 */
export interface TronSnapSignatureResult {
  signature?: string;
}

/**
 * Union of request shapes returned by the inbound Tron mapper.
 *
 * Params are `Partial<>` because the mapper passes through whatever the dapp
 * sent — missing fields are not synthesized. The Snap will reject incomplete
 * requests downstream.
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
