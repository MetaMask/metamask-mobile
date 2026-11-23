import { HandlerType } from '@metamask/snaps-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SnapId, CaipAssetType } from '@metamask/snaps-sdk';

import Engine from '../Engine';
import { handleSnapRequest } from '../Snaps/utils';

/**
 * Result returned by the Tron Snap `onAmountInput` client request.
 */
export interface SnapAmountValidationResult {
  valid: boolean;
  errors?: { code: string }[];
}

/**
 * Asks the account's Tron Snap to validate a transfer before it is sent.
 *
 * Tron fees depend on the destination (energy and bandwidth), so `toAddress`
 * is passed along with the amount so the Snap can check that the account can
 * cover both the value and the resources needed for that specific transfer.
 *
 * @param fromAccount - The Snap-managed Tron account sending the funds.
 * @param params - The transfer to validate.
 * @param params.accountId - The internal account id of the sender.
 * @param params.assetId - The CAIP-19 asset id being sent.
 * @param params.value - The amount to send, in display units.
 * @param params.toAddress - The destination address.
 * @returns The Snap validation result, or undefined if the Snap returned nothing.
 */
export async function validateTronTransferAmount(
  fromAccount: InternalAccount,
  params: {
    accountId: string;
    assetId: CaipAssetType;
    value: string;
    toAddress: string;
  },
): Promise<SnapAmountValidationResult | undefined> {
  return (await handleSnapRequest(Engine.controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'onAmountInput',
      params,
    },
  })) as SnapAmountValidationResult | undefined;
}
