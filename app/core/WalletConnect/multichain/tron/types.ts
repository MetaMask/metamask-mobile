import type { RpcMethod } from '../types';

/**
 * A Tron address in Base58Check format, starting with 'T'.
 */
export type TronAddress = `T${string}`;

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
 * WalletConnect Tron RPC contract.
 *
 * `tron_method_version: 'v1'` asks dapps for the flat v1 transaction shape,
 * but the mapper still accepts the legacy double-wrapped shape for backwards
 * compatibility.
 *
 * @see https://docs.reown.com/advanced/multichain/rpc-reference/tron-rpc
 */
export interface TronWalletConnectSpec {
  tron_signMessage: {
    params: {
      address: string;
      message: string;
    };
    response: {
      signature: string;
    };
  };
  tron_signTransaction: {
    params: {
      address: string;
      transaction: TronWalletConnectTransaction;
    };
    response: TronWalletConnectTransaction & {
      signature: string[];
    };
  };
}

/**
 * Tron Snap RPC contract used by the mobile WalletConnect bridge.
 */
export interface TronSnapSpec {
  signMessage: {
    params: {
      address: TronAddress;
      message: string;
    };
    response: {
      signature: string;
    };
  };
  signTransaction: {
    params: {
      address: TronAddress;
      transaction: {
        rawDataHex?: string;
        type?: string;
      };
    };
    response: {
      signature: string;
    };
  };
}
