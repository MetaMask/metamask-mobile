import { useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePredictImplementation } from '../implementation';
import { usePredictDetailsItem } from './internal/legacy/details/usePredictDetailsItem';

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
 * legacy branch looks the identifier up in `usePredictActivity` unchanged and
 * is the only branch that runs while legacy is active. The next branch
 * resolves nothing until E5 (PRED-1410).
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
  const { item, isLoading } = usePredictDetailsItem(
    isLegacy ? identifier : undefined,
    chainId,
  );

  return useMemo(() => {
    if (isResolving) {
      return { item: undefined, isLoading: Boolean(identifier) };
    }
    return isLegacy ? { item, isLoading } : NO_ITEM;
  }, [identifier, isLegacy, isLoading, isResolving, item]);
};
