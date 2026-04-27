import AppConstants from '../../../../../core/AppConstants';
import type { IDelegationNetworkAdapter } from './IDelegationNetworkAdapter';

type SignPersonalMessageFn = (params: {
  data: string;
  from: string;
}) => Promise<string>;

/**
 * Delegation adapter for EVM-compatible chains (Linea, Ethereum, Base, etc.).
 *
 * Signing: KeyringController.signPersonalMessage via the controller messenger.
 * SIWE message: includes expiry (2 min window) per EIP-4361.
 */
export class EvmDelegationAdapter implements IDelegationNetworkAdapter {
  private readonly signPersonalMessage: SignPersonalMessageFn;

  constructor(signPersonalMessage: SignPersonalMessageFn) {
    this.signPersonalMessage = signPersonalMessage;
  }

  buildSignatureMessage(
    address: string,
    challenge: string,
    caipChainId?: string,
  ): string {
    const chainId = caipChainId?.split(':')[1] ?? '59144';
    const now = new Date();
    const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
    const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
    const uri = `https://${domain}`;

    return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${challenge}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
  }

  async signMessage(params: {
    accountId?: string;
    address: string;
    hexMessage: string;
  }): Promise<string> {
    return this.signPersonalMessage({
      data: params.hexMessage,
      from: params.address,
    });
  }
}
