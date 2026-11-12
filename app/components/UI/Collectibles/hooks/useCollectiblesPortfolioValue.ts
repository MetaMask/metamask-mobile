import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCollectiblesEnabledFlag } from '../selectors/featureFlags';
import { usePackPartnerCards } from '../providers/pack-partner/hooks/usePackPartnerCards';
import { getCollectionValueUsd } from '../utils/collectionValue';

export type CollectiblesPortfolioValue =
  | { status: 'ready'; valueUsd: number }
  | { status: 'loading' | 'error' | 'unavailable' };

/** The same owned-card read and USD valuation as My Collection, without offers. */
export const useCollectiblesPortfolioValue = (): CollectiblesPortfolioValue => {
  const enabled = useSelector(selectCollectiblesEnabledFlag);
  const { account, cards, hasLoaded, error } = usePackPartnerCards({ enabled });
  const valueUsd = useMemo(() => getCollectionValueUsd(cards), [cards]);
  if (!enabled || !account) return { status: 'unavailable' };
  // A failed background refresh must preserve even a previously empty snapshot.
  if (!hasLoaded) return { status: error ? 'error' : 'loading' };
  return Number.isFinite(valueUsd)
    ? { status: 'ready', valueUsd }
    : { status: 'error' };
};
