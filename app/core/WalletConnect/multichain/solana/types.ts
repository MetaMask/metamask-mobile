import type { RpcMethod } from '../types';

/**
 * WalletConnect Solana RPC contract.
 *
 * @see https://docs.reown.com/advanced/multichain/rpc-reference/solana-rpc
 */
export interface SolanaWalletConnectSendOptions {
  skipPreflight?: boolean;
  preflightCommitment?:
    | 'processed'
    | 'confirmed'
    | 'finalized'
    | 'recent'
    | 'single'
    | 'singleGossip'
    | 'root'
    | 'max';
  maxRetries?: number;
  minContextSlot?: number;
}

export interface SolanaWalletConnectSpec {
  solana_getAccounts: {
    params: Record<string, never> | undefined;
    response: { pubkey: string }[];
  };
  solana_requestAccounts: {
    params: Record<string, never> | undefined;
    response: { pubkey: string }[];
  };
  solana_signMessage: {
    params: {
      message: string;
      pubkey: string;
    };
    response: {
      signature: string;
    };
  };
  solana_signTransaction: {
    params: {
      transaction: string;
      pubkey?: string;
    };
    response: {
      signature?: string;
      transaction?: string;
    };
  };
  solana_signAllTransactions: {
    params: {
      transactions: string[];
    };
    response: {
      transactions: string[];
    };
  };
  solana_signAndSendTransaction: {
    params: {
      transaction: string;
      pubkey?: string;
      sendOptions?: SolanaWalletConnectSendOptions;
    };
    response: {
      signature: string;
    };
  };
}

/**
 * Solana Snap / CAIP-25 RPC contract used by the mobile WalletConnect bridge.
 *
 * @see https://docs.metamask.io/metamask-connect/multichain/guides/send-transactions/
 */
export interface SolanaSnapSpec {
  signMessage: {
    params: {
      account: { address: string };
      message: string;
    };
    response: {
      signature: string;
    };
  };
  signTransaction: {
    params: {
      account: { address: string };
      transaction: string;
    };
    response: {
      signature?: string;
      transaction?: string;
    };
  };
  signAndSendTransaction: {
    params: {
      account: { address: string };
      transaction: string;
      options?: SolanaWalletConnectSendOptions;
    };
    response: {
      signature: string;
    };
  };
}

export type SolanaWalletConnectMethod = RpcMethod<SolanaWalletConnectSpec>;
