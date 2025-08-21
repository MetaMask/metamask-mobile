import { HandlerType } from '@metamask/snaps-utils';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

import { handleSnapRequest } from '../../../../core/Snaps/utils';
import Engine from '../../../../core/Engine';

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
