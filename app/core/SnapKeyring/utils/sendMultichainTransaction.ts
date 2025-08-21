import { HandlerType } from '@metamask/snaps-utils';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

import { handleSnapRequest } from '../../Snaps/utils';
import Engine from '../../Engine';

const controllerMessenger = Engine.controllerMessenger;

export async function sendMultichainTransactionForReview(
  snapId: SnapId,
  params: {
    fromAccountId: string;
    toAddress: string;
    assetId: CaipAssetType;
    amount: string;
  },
) {
  await handleSnapRequest(controllerMessenger, {
    snapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'confirmSend',
      params,
    },
  });
}

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
