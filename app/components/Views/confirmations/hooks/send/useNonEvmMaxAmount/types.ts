import BN from 'bnjs4';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/utils';

export interface MaxSendableAmountRequest {
  fromAccount: InternalAccount;
  assetId: CaipAssetType;
  toAddress?: string;
  balance: {
    rawBalanceBN: BN;
    decimals: number;
    isNative: boolean;
  };
}

export type GetMaxSendableAmount = (
  request: MaxSendableAmountRequest,
) => Promise<{ amount: string }>;
