import { handleSnapRequest } from '../../../../Snaps/utils';
import Engine from '../../../../Engine';
import { SOLANA_WALLET_SNAP_ID } from '../../../../SnapKeyring/SolanaWalletSnap';
import { HandlerType } from '@metamask/snaps-utils';

export interface SignRewardsMessageResult {
  signature: string;
  signedMessage: string;
  signatureType: 'ed25519';
}

export async function signSolanaRewardsMessage(
  address: string,
  message: string,
): Promise<SignRewardsMessageResult> {
  try {
    // Method 1: Using handleSnapRequest directly
    const result = await handleSnapRequest(Engine.controllerMessenger, {
      origin: 'metamask',
      snapId: SOLANA_WALLET_SNAP_ID,
      handler: HandlerType.OnClientRequest,
      request: {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'signRewardsMessage',
        params: {
          account: {
            address,
          },
          message,
        },
      },
    });

    return result as SignRewardsMessageResult;
  } catch (error) {
    console.error('Error signing Solana rewards message:', error);
    throw error;
  }
}
