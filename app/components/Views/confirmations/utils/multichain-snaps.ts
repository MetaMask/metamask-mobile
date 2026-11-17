import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SnapId, CaipAssetType, CaipChainId } from '@metamask/snaps-sdk';

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

/**
 * Sign and send a transaction with the account's snap without showing a
 * confirmation.
 *
 * @param fromAccount - Account to sign with.
 * @param params - Request parameters.
 * @param params.scope - CAIP-2 chain ID of the transaction.
 * @param params.transaction - Base64 encoded unsigned transaction.
 * @returns The snap response containing the transaction ID.
 */
export async function signAndSendMultichainTransaction(
  fromAccount: InternalAccount,
  params: { scope: CaipChainId; transaction: string },
) {
  return await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'signAndSendTransaction',
      params: { ...params, accountId: fromAccount.id },
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
