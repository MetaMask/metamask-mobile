import { HandlerType } from '@metamask/snaps-utils';
import { handleSnapRequest } from '../../Snaps/utils';
import Engine from '../../Engine';
import { CaipAssetType, SnapId } from '@metamask/snaps-sdk';

const controllerMessenger = Engine.controllerMessenger;

export async function sendMultichainTransaction(
  snapId: SnapId,
  {
    account,
    scope,
    assetType,
  }: {
    account: string;
    scope: string;
    assetType?: CaipAssetType;
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
        assetType,
      },
    },
  });
}
