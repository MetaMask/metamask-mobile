import type { ActivityFee, ActivityListItem } from './types';

/**
 * Fee marker for a network fee sponsored by MetaMask.
 *
 * Activity fees normally carry token amounts. A sponsored network fee has no
 * user-paid token amount, so this marker preserves that state without inventing
 * a zero native-token amount.
 */
export const GAS_FEE_SPONSORED = 'gas-fee-sponsored';

function getSponsoredFees(item: ActivityListItem): ActivityFee[] | undefined {
  return 'fees' in item.data
    ? item.data.fees?.filter((fee) => fee.type === GAS_FEE_SPONSORED)
    : undefined;
}

/**
 * Preserves locally-known gas sponsorship when Activity Details prefers an API
 * item over the local transaction item.
 *
 * The API item can have richer token metadata for completed swaps, but it does
 * not know the local TransactionController `isGasFeeSponsored` flag. When the
 * local item carries the sponsored marker, replace the API/native base fee with
 * that marker and keep any non-base API fees.
 */
export function mergeActivityItemSponsoredFees(
  sourceItem: ActivityListItem,
  targetItem: ActivityListItem,
): ActivityListItem {
  const sponsoredFees = getSponsoredFees(sourceItem);

  if (!sponsoredFees?.length || !('fees' in targetItem.data)) {
    return targetItem;
  }

  const nonBaseTargetFees =
    targetItem.data.fees?.filter(
      (fee) => fee.type !== 'base' && fee.type !== GAS_FEE_SPONSORED,
    ) ?? [];

  return {
    ...targetItem,
    data: {
      ...targetItem.data,
      fees: [...sponsoredFees, ...nonBaseTargetFees],
    },
  } as ActivityListItem;
}
