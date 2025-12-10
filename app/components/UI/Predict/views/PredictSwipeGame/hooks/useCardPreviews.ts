import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePredictTrading } from '../../../hooks/usePredictTrading';
import { Side } from '../../../types';
import { OrderPreview } from '../../../providers/types';
import {
  SwipeGameCard,
  CardPreview,
  SwipeBetPreview,
} from '../PredictSwipeGame.types';

const PREVIEW_REFRESH_INTERVAL = 5000; // 5 seconds
const PREVIEW_DEBOUNCE_MS = 300; // Debounce bet amount changes

/**
 * Extended CardPreview that includes raw OrderPreview data for placing orders
 */
export interface ExtendedCardPreview extends CardPreview {
  rawYesPreview: OrderPreview | null;
  rawNoPreview: OrderPreview | null;
}

interface UseCardPreviewsParams {
  cards: SwipeGameCard[];
  currentIndex: number;
  betAmount: number;
  preloadCount?: number; // Number of cards ahead to preload previews
}

interface UseCardPreviewsReturn {
  currentPreview: ExtendedCardPreview | null;
  preloadedPreviews: Map<string, ExtendedCardPreview>;
  refreshPreview: () => void;
  isRefreshing: boolean;
}

/**
 * Transforms an OrderPreview into a SwipeBetPreview for display
 */
const transformToSwipeBetPreview = (
  preview: OrderPreview,
  betAmount: number,
): SwipeBetPreview => {
  const sharePrice = preview.sharePrice;
  const estimatedShares = preview.minAmountReceived;
  // Potential win is the shares received minus the amount spent (profit only)
  const potentialWin = estimatedShares - betAmount;
  // Odds calculation: how much you get back per $1 bet
  const oddsMultiplier = estimatedShares / betAmount;

  return {
    sharePrice,
    estimatedShares,
    potentialWin: Math.max(0, potentialWin),
    odds: `${oddsMultiplier.toFixed(2)}x`,
    maxAmountSpent: preview.maxAmountSpent,
    minAmountReceived: preview.minAmountReceived,
    fees: preview.fees
      ? {
          metamaskFee: preview.fees.metamaskFee,
          providerFee: preview.fees.providerFee,
          totalFee: preview.fees.totalFee,
        }
      : undefined,
  };
};

/**
 * Hook to fetch and manage order previews for swipe game cards.
 * Fetches previews for both Yes and No bets, with preloading for upcoming cards.
 */
export const useCardPreviews = ({
  cards,
  currentIndex,
  betAmount,
  preloadCount = 2,
}: UseCardPreviewsParams): UseCardPreviewsReturn => {
  const { previewOrder } = usePredictTrading();

  const [previews, setPreviews] = useState<Map<string, ExtendedCardPreview>>(
    new Map(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for tracking state across async operations
  const isMountedRef = useRef(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBetAmountRef = useRef(betAmount);
  const fetchingCardsRef = useRef<Set<string>>(new Set());

  // Get the current card and cards to preload
  const currentCard = cards[currentIndex];
  const cardsToPreload = useMemo(() => {
    const result: SwipeGameCard[] = [];
    for (let i = 0; i <= preloadCount && currentIndex + i < cards.length; i++) {
      result.push(cards[currentIndex + i]);
    }
    return result;
  }, [cards, currentIndex, preloadCount]);

  /**
   * Fetch preview for a single card (both Yes and No)
   */
  const fetchCardPreview = useCallback(
    async (card: SwipeGameCard): Promise<ExtendedCardPreview> => {
      const { marketId, providerId, primaryOutcome } = card;
      const { outcomeId, yesToken, noToken } = primaryOutcome;

      let yesPreview: SwipeBetPreview | null = null;
      let noPreview: SwipeBetPreview | null = null;
      let rawYesPreview: OrderPreview | null = null;
      let rawNoPreview: OrderPreview | null = null;
      let error: string | null = null;

      try {
        // Fetch both previews in parallel
        const [yesResult, noResult] = await Promise.allSettled([
          previewOrder({
            providerId,
            marketId,
            outcomeId,
            outcomeTokenId: yesToken.id,
            side: Side.BUY,
            size: betAmount,
          }),
          previewOrder({
            providerId,
            marketId,
            outcomeId,
            outcomeTokenId: noToken.id,
            side: Side.BUY,
            size: betAmount,
          }),
        ]);

        if (yesResult.status === 'fulfilled') {
          rawYesPreview = yesResult.value;
          yesPreview = transformToSwipeBetPreview(yesResult.value, betAmount);
        } else {
          console.warn('Failed to fetch Yes preview:', yesResult.reason);
        }

        if (noResult.status === 'fulfilled') {
          rawNoPreview = noResult.value;
          noPreview = transformToSwipeBetPreview(noResult.value, betAmount);
        } else {
          console.warn('Failed to fetch No preview:', noResult.reason);
        }

        // If both failed, set error
        if (!yesPreview && !noPreview) {
          error = 'Failed to fetch order previews';
        }
      } catch (err) {
        console.error('Error fetching card preview:', err);
        error =
          err instanceof Error ? err.message : 'Failed to fetch order preview';
      }

      return {
        cardId: marketId,
        betAmount,
        yesPreview,
        noPreview,
        rawYesPreview,
        rawNoPreview,
        isLoading: false,
        error,
        timestamp: Date.now(),
      };
    },
    [previewOrder, betAmount],
  );

  /**
   * Fetch previews for all cards that need them
   */
  const fetchPreviews = useCallback(async () => {
    if (!isMountedRef.current || betAmount <= 0) return;

    setIsRefreshing(true);

    const cardsNeedingPreview = cardsToPreload.filter((card) => {
      const existing = previews.get(card.marketId);
      const isFetching = fetchingCardsRef.current.has(card.marketId);

      // Fetch if:
      // 1. No existing preview
      // 2. Bet amount changed
      // 3. Preview is stale (> 5 seconds old)
      const needsFetch =
        !existing ||
        existing.betAmount !== betAmount ||
        Date.now() - existing.timestamp > PREVIEW_REFRESH_INTERVAL;

      return needsFetch && !isFetching;
    });

    if (cardsNeedingPreview.length === 0) {
      setIsRefreshing(false);
      return;
    }

    // Mark cards as fetching
    cardsNeedingPreview.forEach((card) => {
      fetchingCardsRef.current.add(card.marketId);
    });

    // Set loading state for cards being fetched
    setPreviews((prev) => {
      const next = new Map(prev);
      cardsNeedingPreview.forEach((card) => {
        const existing = next.get(card.marketId);
        next.set(card.marketId, {
          cardId: card.marketId,
          betAmount,
          yesPreview: existing?.yesPreview ?? null,
          noPreview: existing?.noPreview ?? null,
          rawYesPreview: existing?.rawYesPreview ?? null,
          rawNoPreview: existing?.rawNoPreview ?? null,
          isLoading: true,
          error: null,
          timestamp: existing?.timestamp ?? Date.now(),
        });
      });
      return next;
    });

    // Fetch all previews
    const results = await Promise.all(
      cardsNeedingPreview.map((card) => fetchCardPreview(card)),
    );

    // Update state if still mounted
    if (isMountedRef.current) {
      setPreviews((prev) => {
        const next = new Map(prev);
        results.forEach((preview) => {
          next.set(preview.cardId, preview);
          fetchingCardsRef.current.delete(preview.cardId);
        });
        return next;
      });
    }

    setIsRefreshing(false);
  }, [cardsToPreload, previews, betAmount, fetchCardPreview]);

  /**
   * Debounced fetch when bet amount changes
   */
  useEffect(() => {
    if (betAmount === lastBetAmountRef.current) return;

    lastBetAmountRef.current = betAmount;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the fetch
    debounceTimerRef.current = setTimeout(() => {
      fetchPreviews();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [betAmount, fetchPreviews]);

  /**
   * Fetch previews when cards change
   */
  useEffect(() => {
    if (cardsToPreload.length > 0 && betAmount > 0) {
      fetchPreviews();
    }
  }, [cardsToPreload, fetchPreviews, betAmount]);

  /**
   * Set up refresh interval
   */
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(() => {
      if (isMountedRef.current && currentCard) {
        fetchPreviews();
      }
    }, PREVIEW_REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [currentCard, fetchPreviews]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Manual refresh function
   */
  const refreshPreview = useCallback(() => {
    fetchPreviews();
  }, [fetchPreviews]);

  // Get current card's preview
  const currentPreview = currentCard
    ? (previews.get(currentCard.marketId) ?? null)
    : null;

  return {
    currentPreview,
    preloadedPreviews: previews,
    refreshPreview,
    isRefreshing,
  };
};

export default useCardPreviews;

