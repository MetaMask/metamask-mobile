/**
 * WalletConnect Bitcoin RPC contract.
 *
 * Mirrors the four Reown Bitcoin methods. `bitcoin_getAccountAddresses` is
 * served locally from the session accounts; the other three map to the
 * Bitcoin Snap keyring (`signMessage`, `signPsbt`, `sendTransfer`).
 *
 * Some dapp-supplied fields have no equivalent in the Snap keyring API and are
 * intentionally not forwarded (documented per mapper): `signMessage.protocol`,
 * `signPsbt.signInputs`, `sendTransfer.changeAddress`, `sendTransfer.memo`.
 *
 * @see https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
 */
export interface BitcoinWalletConnectSpec {
  bitcoin_getAccountAddresses: {
    params: {
      account: string;
      intentions?: string[];
    };
    response: {
      address: string;
      publicKey?: string;
      path?: string;
      intention?: string;
    }[];
  };
  bitcoin_signMessage: {
    params: {
      account: string;
      message: string;
      address?: string;
      protocol?: 'ecdsa' | 'bip322';
    };
    response: {
      address: string;
      signature: string;
      messageHash?: string;
    };
  };
  bitcoin_signPsbt: {
    params: {
      account: string;
      /**
       * Base64-encoded PSBT.
       */
      psbt: string;
      signInputs: {
        address: string;
        index: number;
        sighashTypes?: number[];
      }[];
      broadcast?: boolean;
    };
    response: {
      /**
       * Base64-encoded signed PSBT.
       */
      psbt: string;
      txid?: string;
    };
  };
  bitcoin_sendTransfer: {
    params: {
      account: string;
      recipientAddress: string;
      /**
       * Amount in satoshis.
       */
      amount: string;
      changeAddress?: string;
      memo?: string;
    };
    response: {
      txid: string;
    };
  };
}

/**
 * Bitcoin Snap keyring RPC contract used by the snap. The signer account and
 * scope are resolved by the routing service, so only the method params travel
 * in the request.
 */
export interface BitcoinSnapSpec {
  signMessage: {
    params: {
      message: string;
    };
    response: {
      signature: string;
    };
  };
  signPsbt: {
    params: {
      /**
       * Base64-encoded PSBT.
       */
      psbt: string;
      options: {
        /**
         * Whether the Snap funds the PSBT with its own inputs/outputs. Always
         * `false` for WalletConnect: the dapp supplies a complete PSBT to sign.
         */
        fill: boolean;
        broadcast: boolean;
      };
    };
    response: {
      psbt: string;
      txid: string | null;
    };
  };
  sendTransfer: {
    params: {
      recipients: {
        address: string;
        /**
         * Amount in satoshis.
         */
        amount: string;
      }[];
    };
    response: {
      txid: string;
    };
  };
}
