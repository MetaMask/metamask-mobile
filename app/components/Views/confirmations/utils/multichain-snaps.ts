import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';

const controllerMessenger = Engine.controllerMessenger;

/**
 * Result returned by a wallet Snap's `onAmountInput` client request.
 */
export interface SnapAmountValidationResult {
  valid: boolean;
  errors?: { code: string }[];
}

/**
 * Result returned by a wallet Snap's `getMaxSendableAmount` client request.
 */
export interface SnapMaxSendableAmountResult {
  amount: string;
}

export async function sendMultichainTransactionForReview(
  fromAccount: InternalAccount,
  params: {
    fromAccountId: string;
    toAddress: string;
    assetId: CaipAssetType;
    amount: string;
    memo?: string;
  },
) {
  return await handleSnapRequest(controllerMessenger, {
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
    toAddress?: string;
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

export async function getMaxSendableAmountMultichain(
  fromAccount: InternalAccount,
  params: {
    accountId: string;
    assetId: CaipAssetType;
    toAddress?: string;
  },
): Promise<SnapMaxSendableAmountResult | undefined> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'getMaxSendableAmount',
      params,
    },
  })) as SnapMaxSendableAmountResult | undefined;
}
