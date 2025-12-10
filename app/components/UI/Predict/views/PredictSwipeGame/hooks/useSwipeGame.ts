import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePredictMarketData } from '../../../hooks/usePredictMarketData';
import { usePredictPlaceOrder } from '../../../hooks/usePredictPlaceOrder';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { transformMarketsToCards } from '../utils/transformMarketToCard';
import { useCardPreviews, ExtendedCardPreview } from './useCardPreviews';
import {
  DEFAULT_BET_AMOUNT,
  PREFETCH_COUNT,
  BET_LIMITS,
} from '../PredictSwipeGame.constants';
import type {
  SwipeGameCard,
  SwipeGameState,
  SwipeGameSessionStats,
} from '../PredictSwipeGame.types';

interface UseSwipeGameOptions {
  initialBetAmount?: number;
}

interface UseSwipeGameReturn {
  // State
  cards: SwipeGameCard[];
  currentCard: SwipeGameCard | null;
  currentIndex: number;
  betAmount: number;
  isLoading: boolean;
  isPendingOrder: boolean;
  error: string | null;
  orderError: string | null;
  sessionStats: SwipeGameSessionStats;
  hasMoreCards: boolean;
  remainingCards: number;

  // Balance info
  balance: number;
  isBalanceLoading: boolean;
  hasInsufficientBalance: boolean;
  canPlaceBet: boolean;

  // Preview data
  currentPreview: ExtendedCardPreview | null;
  isPreviewLoading: boolean;

  // Last bet info (for undo toast)
  lastBet: {
    type: 'yes' | 'no';
    marketTitle: string;
    betAmount: number;
    potentialWin: number;
  } | null;

  // Actions
  handleSwipeRight: () => void; // YES bet
  handleSwipeLeft: () => void; // NO bet
  handleSwipeDown: () => void; // Skip
  handleUndo: () => void;
  setBetAmount: (amount: number) => void;
  selectOutcome: (outcomeId: string) => void;
  refresh: () => void;
  clearOrderError: () => void;
}

/**
 * Main orchestrator hook for the Swipe Game
 *
 * Manages:
 * - Card data fetching and transformation
 * - Current card tracking
 * - Bet amount selection
 * - Swipe actions (without actual betting in Phase 1)
 * - Session statistics
 */
export function useSwipeGame({
  initialBetAmount = DEFAULT_BET_AMOUNT,
}: UseSwipeGameOptions = {}): UseSwipeGameReturn {
  // Fetch trending markets
  const {
    marketData: markets,
    isFetching: isLoadingMarkets,
    fetchMore,
    refetch: refreshMarkets,
  } = usePredictMarketData({
    category: 'trending',
    pageSize: 20,
  });

  // Get user balance
  const {
    balance,
    isLoading: isBalanceLoading,
    loadBalance,
  } = usePredictBalance({
    loadOnMount: true,
    refreshOnFocus: true,
  });

  // Local state
  const [state, setState] = useState<SwipeGameState>({
    cards: [],
    currentIndex: 0,
    betAmount: initialBetAmount,
    isLoading: true,
    isPendingOrder: false,
    error: null,
    sessionStats: {
      betsPlaced: 0,
      totalWagered: 0,
      skipped: 0,
      startTime: Date.now(),
    },
  });

  // Track selected outcome per card (for multi-outcome markets)
  const [selectedOutcomes, setSelectedOutcomes] = useState<
    Record<string, string>
  >({});

  // Last bet info for undo toast
  const [lastBet, setLastBet] = useState<{
    type: 'yes' | 'no';
    marketTitle: string;
    betAmount: number;
    potentialWin: number;
  } | null>(null);

  // Order error state
  const [orderError, setOrderError] = useState<string | null>(null);

  // Fetch order previews for current and upcoming cards
  const {
    currentPreview,
    isRefreshing: isPreviewRefreshing,
    refreshPreview,
  } = useCardPreviews({
    cards: state.cards,
    currentIndex: state.currentIndex,
    betAmount: state.betAmount,
  });

  // Order placement hook
  const {
    placeOrder,
    isLoading: isPlacingOrder,
    error: placeOrderError,
  } = usePredictPlaceOrder({
    onComplete: (result) => {
      console.log('[SwipeGame] Order placed successfully:', result);
    },
    onError: (error) => {
      console.error('[SwipeGame] Order placement failed:', error);
      setOrderError(error);
    },
  });

  // Update isPendingOrder in state when order is being placed
  useEffect(() => {
    setState((s) => ({
      ...s,
      isPendingOrder: isPlacingOrder,
    }));
  }, [isPlacingOrder]);

  // Transform markets to cards when data changes
  useEffect(() => {
    if (markets && markets.length > 0) {
      const cards = transformMarketsToCards(markets);
      setState((s) => ({
        ...s,
        cards,
        isLoading: false,
        error: cards.length === 0 ? 'No valid markets found' : null,
      }));
    }
  }, [markets]);

  // Update loading state
  useEffect(() => {
    setState((s) => ({
      ...s,
      isLoading: isLoadingMarkets && s.cards.length === 0,
    }));
  }, [isLoadingMarkets]);

  // Prefetch more cards when running low
  useEffect(() => {
    const remainingCards = state.cards.length - state.currentIndex;
    if (remainingCards < PREFETCH_COUNT && !isLoadingMarkets) {
      fetchMore();
    }
  }, [state.currentIndex, state.cards.length, isLoadingMarkets, fetchMore]);

  // Current card
  const currentCard = useMemo(() => {
    if (state.currentIndex >= state.cards.length) return null;
    return state.cards[state.currentIndex];
  }, [state.cards, state.currentIndex]);

  // Has more cards
  const hasMoreCards = state.currentIndex < state.cards.length;
  const remainingCards = Math.max(0, state.cards.length - state.currentIndex);

  // Advance to next card
  const advanceCard = useCallback(() => {
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
    }));
  }, []);

  // Handle swipe RIGHT (YES bet)
  const handleSwipeRight = useCallback(async () => {
    if (!currentCard || !currentPreview?.rawYesPreview) {
      console.warn('[SwipeGame] Cannot place YES bet - no preview available');
      return;
    }

    if (isPlacingOrder) {
      console.warn('[SwipeGame] Order already in progress');
      return;
    }

    // Check balance before placing bet
    if (hasInsufficientBalance) {
      console.warn('[SwipeGame] Insufficient balance for YES bet');
      setOrderError('Insufficient balance. Please add funds.');
      return;
    }

    if (isBelowMinimum) {
      console.warn('[SwipeGame] Bet amount below minimum');
      setOrderError(`Minimum bet is $${BET_LIMITS.MIN}`);
      return;
    }

    // Clear any previous order error
    setOrderError(null);

    // Store last bet info for undo toast
    const potentialWin = currentPreview.yesPreview?.potentialWin ?? 0;
    setLastBet({
      type: 'yes',
      marketTitle: currentCard.title,
      betAmount: state.betAmount,
      potentialWin,
    });

    // Advance card and update stats
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
      sessionStats: {
        ...s.sessionStats,
        betsPlaced: s.sessionStats.betsPlaced + 1,
        totalWagered: s.sessionStats.totalWagered + s.betAmount,
      },
    }));

    // Place the actual order
    try {
      await placeOrder({
        providerId: currentCard.providerId,
        preview: currentPreview.rawYesPreview,
        analyticsProperties: {
          marketId: currentCard.marketId,
          marketTitle: currentCard.title,
          entryPoint: 'swipe_game',
          transactionType: 'buy',
          sharePrice: currentPreview.rawYesPreview.sharePrice,
        },
      });

      console.log('[SwipeGame] YES bet placed on:', currentCard.title);
    } catch (err) {
      console.error('[SwipeGame] Failed to place YES bet:', err);
      // Error is already handled by usePredictPlaceOrder's onError callback
    }
  }, [
    currentCard,
    currentPreview,
    isPlacingOrder,
    hasInsufficientBalance,
    isBelowMinimum,
    state.betAmount,
    placeOrder,
  ]);

  // Handle swipe LEFT (NO bet)
  const handleSwipeLeft = useCallback(async () => {
    if (!currentCard || !currentPreview?.rawNoPreview) {
      console.warn('[SwipeGame] Cannot place NO bet - no preview available');
      return;
    }

    if (isPlacingOrder) {
      console.warn('[SwipeGame] Order already in progress');
      return;
    }

    // Check balance before placing bet
    if (hasInsufficientBalance) {
      console.warn('[SwipeGame] Insufficient balance for NO bet');
      setOrderError('Insufficient balance. Please add funds.');
      return;
    }

    if (isBelowMinimum) {
      console.warn('[SwipeGame] Bet amount below minimum');
      setOrderError(`Minimum bet is $${BET_LIMITS.MIN}`);
      return;
    }

    // Clear any previous order error
    setOrderError(null);

    // Store last bet info for undo toast
    const potentialWin = currentPreview.noPreview?.potentialWin ?? 0;
    setLastBet({
      type: 'no',
      marketTitle: currentCard.title,
      betAmount: state.betAmount,
      potentialWin,
    });

    // Advance card and update stats
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
      sessionStats: {
        ...s.sessionStats,
        betsPlaced: s.sessionStats.betsPlaced + 1,
        totalWagered: s.sessionStats.totalWagered + s.betAmount,
      },
    }));

    // Place the actual order
    try {
      await placeOrder({
        providerId: currentCard.providerId,
        preview: currentPreview.rawNoPreview,
        analyticsProperties: {
          marketId: currentCard.marketId,
          marketTitle: currentCard.title,
          entryPoint: 'swipe_game',
          transactionType: 'buy',
          sharePrice: currentPreview.rawNoPreview.sharePrice,
        },
      });

      console.log('[SwipeGame] NO bet placed on:', currentCard.title);
    } catch (err) {
      console.error('[SwipeGame] Failed to place NO bet:', err);
      // Error is already handled by usePredictPlaceOrder's onError callback
    }
  }, [
    currentCard,
    currentPreview,
    isPlacingOrder,
    hasInsufficientBalance,
    isBelowMinimum,
    state.betAmount,
    placeOrder,
  ]);

  // Handle swipe DOWN (Skip)
  const handleSwipeDown = useCallback(() => {
    if (!currentCard) return;

    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
      sessionStats: {
        ...s.sessionStats,
        skipped: s.sessionStats.skipped + 1,
      },
    }));

    console.log('[SwipeGame] Skipped:', currentCard.title);
  }, [currentCard]);

  // Handle undo - go back to previous card
  const handleUndo = useCallback(() => {
    if (state.currentIndex > 0) {
      setState((s) => ({
        ...s,
        currentIndex: s.currentIndex - 1,
      }));
      console.log('[SwipeGame] Undo - going back to previous card');
    }
  }, [state.currentIndex]);

  // Set bet amount
  const setBetAmount = useCallback((amount: number) => {
    setState((s) => ({
      ...s,
      betAmount: amount,
    }));
  }, []);

  // Select outcome for multi-outcome markets
  const selectOutcome = useCallback(
    (outcomeId: string) => {
      if (!currentCard) return;

      setSelectedOutcomes((prev) => ({
        ...prev,
        [currentCard.marketId]: outcomeId,
      }));

      // Update the card's primary outcome
      // This creates a new card with the selected outcome as primary
      const selectedOutcome = currentCard.alternativeOutcomes.find(
        (o) => o.outcomeId === outcomeId,
      );

      if (selectedOutcome) {
        setState((s) => {
          const updatedCards = [...s.cards];
          const cardIndex = s.currentIndex;

          if (cardIndex < updatedCards.length) {
            const card = updatedCards[cardIndex];
            const oldPrimary = card.primaryOutcome;

            // Swap: selected becomes primary, old primary goes to alternatives
            updatedCards[cardIndex] = {
              ...card,
              primaryOutcome: {
                outcomeId: selectedOutcome.outcomeId,
                // Use fullTitle when becoming primary for complete display
                title: selectedOutcome.fullTitle || selectedOutcome.title,
                yesToken: selectedOutcome.yesToken,
                noToken: selectedOutcome.noToken,
                negRisk: selectedOutcome.negRisk,
                tickSize: selectedOutcome.tickSize,
              },
              alternativeOutcomes: [
                {
                  outcomeId: oldPrimary.outcomeId,
                  title: oldPrimary.title, // Will be shown in alternatives list
                  fullTitle: oldPrimary.title, // Full title for if selected again
                  volume: 0, // We don't have volume for the old primary
                  yesToken: oldPrimary.yesToken,
                  noToken: oldPrimary.noToken,
                  negRisk: oldPrimary.negRisk,
                  tickSize: oldPrimary.tickSize,
                },
                ...card.alternativeOutcomes.filter(
                  (o) => o.outcomeId !== outcomeId,
                ),
              ],
            };
          }

          return { ...s, cards: updatedCards };
        });
      }
    },
    [currentCard],
  );

  // Refresh markets
  const refresh = useCallback(() => {
    setState((s) => ({
      ...s,
      currentIndex: 0,
      isLoading: true,
      error: null,
      sessionStats: {
        betsPlaced: 0,
        totalWagered: 0,
        skipped: 0,
        startTime: Date.now(),
      },
    }));
    refreshMarkets();
  }, [refreshMarkets]);

  // Combined preview loading state
  const isPreviewLoading =
    isPreviewRefreshing ||
    (currentPreview?.isLoading ?? false) ||
    (currentCard && !currentPreview);

  // Calculate total cost including fees
  const totalBetCost = useMemo(() => {
    const fees = currentPreview?.yesPreview?.fees?.totalFee ?? 0;
    return state.betAmount + fees;
  }, [state.betAmount, currentPreview?.yesPreview?.fees?.totalFee]);

  // Balance check
  const hasInsufficientBalance = balance < totalBetCost;
  const isBelowMinimum = state.betAmount < BET_LIMITS.MIN;

  // Can place bet check
  const canPlaceBet = useMemo(() => (
      !hasInsufficientBalance &&
      !isBelowMinimum &&
      !isBalanceLoading &&
      !isPlacingOrder &&
      currentPreview !== null &&
      !currentPreview.isLoading &&
      currentPreview.error === null
    ), [
    hasInsufficientBalance,
    isBelowMinimum,
    isBalanceLoading,
    isPlacingOrder,
    currentPreview,
  ]);

  // Clear order error
  const clearOrderError = useCallback(() => {
    setOrderError(null);
  }, []);

  return {
    // State
    cards: state.cards,
    currentCard,
    currentIndex: state.currentIndex,
    betAmount: state.betAmount,
    isLoading: state.isLoading,
    isPendingOrder: state.isPendingOrder || isPlacingOrder,
    error: state.error,
    orderError,
    sessionStats: state.sessionStats,
    hasMoreCards,
    remainingCards,

    // Balance info
    balance,
    isBalanceLoading,
    hasInsufficientBalance,
    canPlaceBet,

    // Preview data
    currentPreview,
    isPreviewLoading: Boolean(isPreviewLoading),

    // Last bet info
    lastBet,

    // Actions
    handleSwipeRight,
    handleSwipeLeft,
    handleSwipeDown,
    handleUndo,
    setBetAmount,
    selectOutcome,
    refresh,
    clearOrderError,
  };
}
