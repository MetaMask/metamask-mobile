import { HandlerType } from '@metamask/snaps-utils';
import AppConstants from '../../../../../core/AppConstants';
import type { IDelegationNetworkAdapter } from './IDelegationNetworkAdapter';

export const SOLANA_WALLET_SNAP_ID = 'npm:@metamask/solana-wallet-snap';

type HandleSnapRequestFn = (args: {
  snapId: string;
  origin: string;
  handler: HandlerType;
  request: {
    jsonrpc: '2.0';
    id: string;
    method: string;
    params: Record<string, unknown>;
  };
}) => Promise<unknown>;

/**
 * Delegation adapter for Solana.
 *
 * Signing: Solana Wallet Snap via SnapController:handleRequest.
 * SIWE message: no expiry (Solana variant per spec).
 */
export class SolanaDelegationAdapter implements IDelegationNetworkAdapter {
  private readonly handleSnapRequest: HandleSnapRequestFn;

  constructor(handleSnapRequest: HandleSnapRequestFn) {
    this.handleSnapRequest = handleSnapRequest;
  }

  buildSignatureMessage(
    address: string,
    challenge: string,
    _caipChainId?: string,
  ): string {
    const now = new Date();
    const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
    const uri = `https://${domain}`;

    return `${domain} wants you to sign in with your Solana account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: 1\nNonce: ${challenge}\nIssued At: ${now.toISOString()}`;
  }

  async signMessage(params: {
    accountId?: string;
    address: string;
    hexMessage: string;
  }): Promise<string> {
    const base64Message = Buffer.from(
      params.hexMessage.replace(/^0x/, ''),
      'hex',
    ).toString('base64');

    const result = (await this.handleSnapRequest({
      snapId: SOLANA_WALLET_SNAP_ID,
      origin: 'metamask',
      handler: HandlerType.OnClientRequest,
      request: {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'signCardMessage',
        params: {
          accountId: params.accountId,
          message: base64Message,
        },
      },
    })) as { signature: string } | null;

    if (!result?.signature) {
      throw new Error('No signature returned from Solana snap');
    }

    return result.signature;
  }
}
