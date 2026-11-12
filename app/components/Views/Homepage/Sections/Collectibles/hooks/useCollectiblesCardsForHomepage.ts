import { useMemo } from 'react';
import { usePackPartnerCards } from '../../../../../UI/Collectibles';
import type {
  CollectiblesCard,
  CollectiblesWalletAccount,
} from '../../../../../UI/Collectibles/types';

export interface UseCollectiblesCardsForHomepageOptions {
  /** Max number of cards returned. */
  maxCards: number;
  /** Pass the feature flag so nothing is read while the feature is off. */
  enabled: boolean;
}

export interface UseCollectiblesCardsForHomepageResult {
  /** Selected account group's Solana account, undefined when there is none. */
  account: CollectiblesWalletAccount | undefined;
  /** Newest cards first, at most `maxCards`. */
  cards: CollectiblesCard[];
  /** First owned-cards read in progress, with no card read yet. */
  isLoading: boolean;
  /** The read failed, or the device is offline, with no card read yet. */
  hasError: boolean;
  /** Loaded, no error, no card. */
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

/**
 * PackPartner cards of the selected Solana account, sliced and mapped to
 * the homepage section states (loading, error, empty, filled). Cards already
 * read win over a failed read.
 */
export const useCollectiblesCardsForHomepage = ({
  maxCards,
  enabled,
}: UseCollectiblesCardsForHomepageOptions): UseCollectiblesCardsForHomepageResult => {
  const {
    account,
    cards: allCards,
    isLoading,
    error,
    refetch,
  } = usePackPartnerCards({ enabled });

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
