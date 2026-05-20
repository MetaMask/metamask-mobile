import { CaipAssetType } from '@metamask/utils';
import AppConstants from '../../../../../core/AppConstants';

export const DEFAULT_BATCH_SELL_SLIPPAGE =
  AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString();

export function getBatchSellInitialSlippage(
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>,
  batchSellAssetId: CaipAssetType,
) {
  return batchSellAssetId in batchSellSlippages
    ? batchSellSlippages[batchSellAssetId]
    : DEFAULT_BATCH_SELL_SLIPPAGE;
}
