/**
 * Adapter interface for network-specific delegation operations.
 * Each network type (EVM, Solana, future chains) implements this interface
 * to abstract differences in message signing and transaction execution.
 */
export interface IDelegationNetworkAdapter {
  /**
   * Build a SIWE (Sign-In With Ethereum/Solana) message for the given network.
   * EVM messages include an expiry; Solana messages do not.
   */
  buildSignatureMessage(
    address: string,
    challenge: string,
    caipChainId?: string,
  ): string;

  /**
   * Sign the SIWE message using the appropriate signer for this network.
   * EVM: KeyringController.signPersonalMessage
   * Solana: Snap.signCardMessage
   */
  signMessage(params: {
    accountId?: string;
    address: string;
    hexMessage: string; // 0x-prefixed UTF-8 hex of the SIWE string
  }): Promise<string>;
}
