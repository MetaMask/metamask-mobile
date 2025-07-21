///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SnapId } from '@metamask/snaps-sdk';
import { Sender } from '@metamask/keyring-snap-client';
import { HandlerType } from '@metamask/snaps-utils';
import { Json, JsonRpcRequest } from '@metamask/utils';
import { handleSnapRequest } from '../Snaps/utils';
import Engine from '../Engine';

export const SOLANA_WALLET_SNAP_ID: SnapId =
  'npm:@metamask/solana-wallet-snap' as SnapId;

export const SOLANA_WALLET_NAME: string = 'Solana';

export class SolanaWalletSnapSender implements Sender {
  // We assume the caller of this module is aware of this. If we try to use this module
  // without having the pre-installed Snap, this will likely throw an error in
  // the `handleSnapRequest` action.
  send = async (request: JsonRpcRequest): Promise<Json> =>
    (await handleSnapRequest(Engine.controllerMessenger, {
      origin: 'metamask',
      snapId: SOLANA_WALLET_SNAP_ID,
      handler: HandlerType.OnKeyringRequest,
      request,
    })) as Json;
}
///: END:ONLY_INCLUDE_IF
