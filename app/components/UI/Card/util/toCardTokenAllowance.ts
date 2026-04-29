import { FundingStatus, type CardFundingToken } from '../types';
import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

const STATUS_TO_FUNDING_STATUS: Record<string, FundingStatus> = {
  active: FundingStatus.Enabled,
  limited: FundingStatus.Limited,
  inactive: FundingStatus.NotEnabled,
};

export function toCardFundingToken(asset: CardFundingAsset): CardFundingToken {
  return {
    address: asset.address,
    decimals: asset.decimals,
    symbol: asset.symbol,
    name: asset.name,
    caipChainId: asset.chainId,
    fundingStatus:
      STATUS_TO_FUNDING_STATUS[asset.status] ?? FundingStatus.NotEnabled,
    spendableBalance: asset.spendableBalance ?? '0',
    spendingCap: asset.spendingCap ?? '0',
    walletAddress: asset.walletAddress,
    priority:
      asset.priority >= Number.MAX_SAFE_INTEGER ? undefined : asset.priority,
    stagingTokenAddress: asset.stagingTokenAddress ?? null,
    delegationContract: asset.delegationContract ?? null,
  };
}
