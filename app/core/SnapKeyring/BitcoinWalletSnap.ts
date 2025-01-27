///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SnapId } from '@metamask/snaps-sdk';
import { Sender } from '@metamask/keyring-snap-client';
import { HandlerType } from '@metamask/snaps-utils';
import { Json, JsonRpcRequest } from '@metamask/utils';
// This dependency is still installed as part of the `package.json`, however
// the Snap is being pre-installed only for Flask build (for the moment).
import BitcoinWalletSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';
import { handleSnapRequest } from '../Snaps/utils';
import Engine from '../Engine';

export const BITCOIN_WALLET_SNAP_ID: SnapId =
  BitcoinWalletSnap.snapId as SnapId;

export const BITCOIN_WALLET_NAME: string =
  BitcoinWalletSnap.manifest.proposedName;

const controllerMessenger = Engine.controllerMessenger;

export class BitcoinWalletSnapSender implements Sender {
  // We assume the caller of this module is aware of this. If we try to use this module
  // without having the pre-installed Snap, this will likely throw an error in
  // the `handleSnapRequest` action.
  send = async (request: JsonRpcRequest): Promise<Json> =>
    (await handleSnapRequest(controllerMessenger, {
      origin: 'metamask',
      snapId: BITCOIN_WALLET_SNAP_ID,
      handler: HandlerType.OnKeyringRequest,
      request,
    })) as Json;
}
///: END:ONLY_INCLUDE_IF
