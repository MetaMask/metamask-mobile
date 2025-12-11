import type { CaipAssetType, SnapId } from '@metamask/snaps-sdk';
import { TronResourceType } from '../../../../core/Multichain/constants';

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
  options: { purpose: TronResourceType.ENERGY | TronResourceType.BANDWIDTH };
}

interface TronUnstakeParams {
  value: string;
  accountId: string;
  assetId: CaipAssetType;
  options: { purpose: TronResourceType.ENERGY | TronResourceType.BANDWIDTH };
}

export type TronUnstakeValidateParams = TronUnstakeParams;
export type TronUnstakeConfirmParams = TronUnstakeParams;

export interface TronStakeResult {
  valid: boolean;
  errors?: string[];
}

export interface TronUnstakeResult {
  valid: boolean;
  errors?: string[];
}

export interface ComputeFeeParams {
  transaction: string;
  accountId: string;
  scope: string;
}

export type ComputeFeeResult = {
  type: string;
  asset: {
    unit: string;
    type: string;
    amount: string;
    fungible: true;
  };
}[];

export interface ComputeStakeFeeParams {
  fromAccountId: string;
  value: string;
  options: {
    purpose: TronResourceType.ENERGY | TronResourceType.BANDWIDTH;
  };
}

export type ComputeStakeFeeResult = ComputeFeeResult;
