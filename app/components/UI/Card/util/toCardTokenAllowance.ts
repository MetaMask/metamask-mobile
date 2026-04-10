import { AllowanceState, type CardTokenAllowance } from '../types';
import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

const STATUS_TO_ALLOWANCE_STATE: Record<string, AllowanceState> = {
  active: AllowanceState.Enabled,
  limited: AllowanceState.Limited,
  inactive: AllowanceState.NotEnabled,
};

export function toCardTokenAllowance(
  asset: CardFundingAsset,
): CardTokenAllowance {
  return {
    address: asset.address,
    decimals: asset.decimals,
    symbol: asset.symbol,
    name: asset.name,
    caipChainId: asset.chainId,
    allowanceState:
      STATUS_TO_ALLOWANCE_STATE[asset.status] ?? AllowanceState.NotEnabled,
    allowance: asset.balance ?? '0',
    totalAllowance: asset.allowance ?? '0',
    availableBalance:
      asset.balance && asset.balance !== '0' ? asset.balance : undefined,
    walletAddress: asset.walletAddress,
    priority:
      asset.priority >= Number.MAX_SAFE_INTEGER ? undefined : asset.priority,
    stagingTokenAddress: asset.stagingTokenAddress ?? null,
    delegationContract: asset.delegationContract ?? null,
  };
}
