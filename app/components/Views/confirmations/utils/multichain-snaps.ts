import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';

const controllerMessenger = Engine.controllerMessenger;

export async function sendMultichainTransactionForReview(
  fromAccount: InternalAccount,
  params: {
    fromAccountId: string;
    toAddress: string;
    assetId: CaipAssetType;
    amount: string;
  },
) {
  await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'confirmSend',
      params,
    },
  });
}

export async function validateAmountMultichain(
  fromAccount: InternalAccount,
  params: {
    value: string;
    accountId: string;
    assetId: CaipAssetType;
  },
) {
  return await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'onAmountInput',
      params,
    },
  });
}
