import { useMemo } from 'react';
import { useCollectorCryptCards } from '../../../../../UI/Gacha';
import type {
  CollectorCryptCard,
  SolanaAccountRef,
} from '../../../../../UI/Gacha/providers/collector-crypt/types';

export interface UseGachaCardsForHomepageOptions {
  /** Max number of cards returned. */
  maxCards: number;
  /** Pass the feature flag so nothing syncs while the feature is off. */
  enabled: boolean;
}

export interface UseGachaCardsForHomepageResult {
  /** Selected account group's Solana account, undefined when there is none. */
  account: SolanaAccountRef | undefined;
  /** Newest cards first, at most `maxCards`. */
  cards: CollectorCryptCard[];
  /** First sync in progress with no cached card. */
  isLoading: boolean;
  /** Sync failed and there is no cached card to show. */
  hasError: boolean;
  /** Loaded, no error, no card. */
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

/**
 * CollectorCrypt cards of the selected Solana account, sliced and mapped to
 * the homepage section states (loading, error, empty, filled). Cached cards
 * win over a failed sync.
 */
export const useGachaCardsForHomepage = ({
  maxCards,
  enabled,
}: UseGachaCardsForHomepageOptions): UseGachaCardsForHomepageResult => {
  const {
    account,
    cards: allCards,
    isLoading,
    error,
    refetch,
  } = useCollectorCryptCards({ enabled });

  const cards = useMemo(
    () => allCards.slice(0, maxCards),
    [allCards, maxCards],
  );

  const hasCards = cards.length > 0;
  const hasError = !isLoading && !hasCards && Boolean(error);

  return {
    account,
    cards,
    isLoading,
    hasError,
    isEmpty: !isLoading && !hasCards && !hasError,
    refetch,
  };
};
