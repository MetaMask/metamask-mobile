import { HandlerType } from '@metamask/snaps-utils';
import { handleSnapRequest } from '../../Snaps/utils';
import Engine from '../../Engine';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

const controllerMessenger = Engine.controllerMessenger;

export async function sendMultichainTransaction(
  snapId: SnapId,
  {
    account,
    scope,
    assetId,
  }: {
    account: string;
    scope: string;
    assetId?: CaipAssetType;
  },
) {
  await handleSnapRequest(controllerMessenger, {
    snapId,
    origin: 'metamask',
    handler: HandlerType.OnRpcRequest,
    request: {
      method: 'startSendTransactionFlow',
      params: {
        account,
        scope,
        ...(assetId !== undefined ? { assetId } : {}),
      },
    },
  });
}
