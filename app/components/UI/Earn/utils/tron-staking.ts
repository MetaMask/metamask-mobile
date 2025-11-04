import { HandlerType } from '@metamask/snaps-utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAssetType, SnapId } from '@metamask/snaps-sdk';
import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';

const controllerMessenger = Engine.controllerMessenger;

export const TRON_WALLET_SNAP_ID: SnapId =
  'npm:@metamask/tron-wallet-snap' as SnapId;

export const TRON_WALLET_NAME: string = 'Tron';


export interface TronStakeValidateParams {
  value: string;
  accountId: string;
  assetId: CaipAssetType;
}

export interface TronStakeConfirmParams {
  fromAccountId: string;
  assetId: CaipAssetType;
  value: string;
  options: { purpose: 'ENERGY' | 'BANDWIDTH' };
}

export interface TronStakeResult {
  valid: boolean;
  errors?: string[];
}

export type FeeType = string;

export interface ComputeFeeParams {
  transaction: string;
  accountId: string;
  scope: string;
}

export type ComputeFeeResult = {
  type: FeeType;
  asset: {
    unit: string;
    type: string;
    amount: string;
    fungible: true;
  };
}[];

export async function validateTronStakeAmount(
  fromAccount: InternalAccount,
  params: TronStakeValidateParams,
): Promise<TronStakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'onStakeAmountInput',
      params,
    },
  })) as TronStakeResult;
}

export async function confirmTronStake(
  fromAccount: InternalAccount,
  params: TronStakeConfirmParams,
): Promise<TronStakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'confirmStake',
      params,
    },
  })) as TronStakeResult;
}

export async function computeTronFee(
  fromAccount: InternalAccount,
  params: ComputeFeeParams,
): Promise<ComputeFeeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'computeFee',
      params,
    },
  })) as ComputeFeeResult;
}
