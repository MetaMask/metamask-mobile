import { HandlerType } from '@metamask/snaps-utils';
import { handleSnapRequest } from '../../Snaps/utils';
import Engine from '../../Engine';
import { SnapId } from '@metamask/snaps-sdk';

const controllerMessenger = Engine.controllerMessenger;

interface SendMultichainTransactionParams {
  account: string;
  scope: string;
  assetType?: string;
}

export async function sendMultichainTransaction(
  snapId: SnapId,
  { account, scope, assetType }: SendMultichainTransactionParams,
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
