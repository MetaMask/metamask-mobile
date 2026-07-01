import type { CaipChainId } from '@metamask/utils';
import type { RpcMethod } from '../types';

/**
 * WalletConnect Solana RPC contract.
 *
 * @see https://docs.reown.com/advanced/multichain/rpc-reference/solana-rpc
 */
export interface SolanaWalletConnectSpec {
  solana_getAccounts: {
    params: undefined;
    response: {
      pubkey: string;
    }[];
  };
  solana_requestAccounts: {
    params: undefined;
    response: {
      pubkey: string;
    }[];
  };
  solana_signMessage: {
    params: {
      pubkey: string;
      /**
       * Base58-encoded message bytes.
       */
      message: string;
    };
    response: {
      signature: string;
    };
  };
  solana_signTransaction: {
    params: {
      transaction: string;
    };
    response: {
      /**
       * Base58 fee-payer signature extracted from the signed transaction.
       */
      signature: string;
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
      sendOptions?: Record<string, unknown>;
    };
    response: {
      signature: string;
    };
  };
}

/**
 * Canonical Snap account reference used to resolve the selected keyring
 * account before routing the signing request.
 */
export interface SolanaSnapAccountParam {
  address: string;
}

/**
 * Solana Snap keyring RPC contract used by the snap.
 */
export interface SolanaSnapSpec {
  signMessage: {
    params: {
      account: SolanaSnapAccountParam;
      /**
       * Base64-encoded message.
       */
      message: string;
    };
    response: {
      signature: string;
    };
  };
  signTransaction: {
    params: {
      account: SolanaSnapAccountParam;
      transaction: string;
      scope: CaipChainId;
      options?: Record<string, unknown>;
    };
    response: {
      signedTransaction: string;
    };
  };
  signAndSendTransaction: {
    params: {
      account: SolanaSnapAccountParam;
      transaction: string;
      scope: CaipChainId;
      options?: Record<string, unknown>;
    };
    response: {
      signature: string;
    };
  };
}
