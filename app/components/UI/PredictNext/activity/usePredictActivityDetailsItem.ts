import { useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePredictImplementation } from '../implementation';
import { usePredictDetailsItem } from './internal/legacy/details/usePredictDetailsItem';
import { mapActivityEntry } from './internal/next/mapActivityEntry';
import { useNextActivityEntry } from './internal/next/useNextActivityEntry';
import { getVenueActivityChainId } from './internal/next/venueActivityChainId';

export interface PredictActivityDetailsItemResult {
  item: ActivityListItem | undefined;
  isLoading: boolean;
}

const NO_ITEM: PredictActivityDetailsItemResult = {
  item: undefined,
  isLoading: false,
};

/**
 * Resolves the Predict Activity item an Activity details screen was opened
 * for, when no shared Activity source has it. Pass `undefined` to skip. The
 * legacy branch looks the identifier up in `usePredictActivity` unchanged.
 * The next branch resolves only the Active Venue's chain id, and looks the
 * canonical id up in that Venue's Activity. Only the active branch reads.
 *
 * @param identifier - The details route's transaction identifier.
 * @param chainId - The details route's chain id, which keys the source.
 * @returns The mapped item, and whether it is still loading.
 */
export const usePredictActivityDetailsItem = (
  identifier: string | undefined,
  chainId?: CaipChainId,
): PredictActivityDetailsItemResult => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const isResolving = resolution.status === 'resolving';
  const nextVenueId =
    resolution.status === 'ready' && resolution.implementation === 'next'
      ? resolution.venueId
      : undefined;
  const nextChainId = getVenueActivityChainId(nextVenueId);
  const isNextSource = nextChainId !== undefined && chainId === nextChainId;

  const legacy = usePredictDetailsItem(
    isLegacy ? identifier : undefined,
    chainId,
  );
  const next = useNextActivityEntry(
    isNextSource ? nextVenueId : undefined,
    isNextSource ? identifier : undefined,
  );

  return useMemo(() => {
    if (isResolving) {
      return { item: undefined, isLoading: Boolean(identifier) };
    }
    if (isLegacy) {
      return { item: legacy.item, isLoading: legacy.isLoading };
    }
    if (!isNextSource || !nextChainId) {
      return NO_ITEM;
    }
    return {
      item: next.entry ? mapActivityEntry(next.entry, nextChainId) : undefined,
      isLoading: next.isLoading,
    };
  }, [
    identifier,
    isLegacy,
    isNextSource,
    isResolving,
    legacy.isLoading,
    legacy.item,
    next.entry,
    next.isLoading,
    nextChainId,
  ]);
};
