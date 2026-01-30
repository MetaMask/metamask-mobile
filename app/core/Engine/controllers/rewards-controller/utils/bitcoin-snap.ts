import { handleSnapRequest } from '../../../../Snaps/utils';
import Engine from '../../../../Engine';
import { BITCOIN_WALLET_SNAP_ID } from '../../../../SnapKeyring/BitcoinWalletSnap';
import { HandlerType } from '@metamask/snaps-utils';
import Logger from '../../../../../util/Logger';

export interface SignRewardsMessageResult {
  signature: string;
  signedMessage: string;
  signatureType: 'ecdsa';
}

export async function signBitcoinRewardsMessage(
  accountId: string,
  message: string,
): Promise<SignRewardsMessageResult> {
  try {
    const result = await handleSnapRequest(Engine.controllerMessenger, {
      origin: 'metamask',
      snapId: BITCOIN_WALLET_SNAP_ID,
      handler: HandlerType.OnClientRequest,
      request: {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'signRewardsMessage',
        params: {
          accountId,
          message,
        },
      },
    });

    return result as SignRewardsMessageResult;
  } catch (error) {
    Logger.log('Error signing Bitcoin rewards message:', error);
    throw error;
  }
}
