/**
 * WalletConnect Stellar RPC contract.
 *
 * The WalletConnect Stellar namespace defines only two methods,
 * `stellar_signXDR` and `stellar_signAndSubmitXDR`. The wallet exposes just
 * `stellar_signXDR` (mapped to the Snap's `signTransaction`);
 * `stellar_signAndSubmitXDR` is omitted because the Stellar Snap is sign-only
 * and never broadcasts.
 *
 * The Snap also implements the SEP-43 `signMessage` and `signAuthEntry`
 * methods, but neither is a WalletConnect method: the reference dapp library
 * rejects both with a `-3` error before any request is emitted, so they are
 * unreachable over WalletConnect and intentionally not modeled here.
 *
 * @see https://docs.reown.com/advanced/multichain/rpc-reference/stellar-rpc
 * @see https://github.com/Creit-Tech/Stellar-Wallets-Kit/blob/v2.1.0/src/sdk/modules/wallet-connect.module.ts#L247-L257
 */
export interface StellarWalletConnectSpec {
  stellar_signXDR: {
    params: {
      /**
       * Base64-encoded transaction envelope XDR.
       */
      xdr: string;
    };
    response: {
      /**
       * Base64-encoded signed transaction envelope XDR.
       */
      signedXDR: string;
    };
  };
}

/**
 * Stellar Snap keyring RPC contract used by the snap. Follows the SEP-43
 * `signTransaction` shape; the signer account and scope are resolved by the
 * routing service, so only the transaction XDR travels in the request params.
 */
export interface StellarSnapSpec {
  signTransaction: {
    params: {
      xdr: string;
    };
    response: {
      signedTxXdr: string;
    };
  };
}
