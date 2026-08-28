import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { Trade, TradeSide } from '../data/mockData';

/**
 * A simulated copied position. Created locally when the user "copies" a
 * mock trade. No funds move and nothing is signed.
 */
export interface SimulatedPosition {
  id: string;
  tradeId: string;
  traderId: string;
  tokenSymbol: string;
  tokenName: string;
  side: TradeSide;
  amountUsd: number;
  entryPrice: number;
  pnlPct: number;
  createdAt: number;
}

export interface SocialTradingState {
  followedIds: string[];
  likedTradeIds: string[];
  positions: SimulatedPosition[];
  toggleFollow: (traderId: string) => void;
  isFollowing: (traderId: string) => boolean;
  toggleLike: (tradeId: string) => void;
  isLiked: (tradeId: string) => boolean;
  copyTrade: (trade: Trade, amountUsd: number) => void;
  closePosition: (positionId: string) => void;
}

const SocialTradingContext = createContext<SocialTradingState | null>(null);

const DEFAULT_FOLLOWED_IDS = ['t1', 't4'];

/**
 * Feature-local, in-memory state for the Social Trading prototype.
 *
 * Deliberately not persisted and not in Redux/controllers: the state is
 * throwaway simulation data scoped to the prototype flow. When the feature
 * graduates, this provider is the seam to replace with real services
 * (Redux slice or controller per the feature development guidelines).
 */
export function SocialTradingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [followedIds, setFollowedIds] =
    useState<string[]>(DEFAULT_FOLLOWED_IDS);
  const [likedTradeIds, setLikedTradeIds] = useState<string[]>([]);
  const [positions, setPositions] = useState<SimulatedPosition[]>([]);

  const toggleFollow = useCallback((traderId: string) => {
    setFollowedIds((ids) =>
      ids.includes(traderId)
        ? ids.filter((id) => id !== traderId)
        : [...ids, traderId],
    );
  }, []);

  const toggleLike = useCallback((tradeId: string) => {
    setLikedTradeIds((ids) =>
      ids.includes(tradeId)
        ? ids.filter((id) => id !== tradeId)
        : [...ids, tradeId],
    );
  }, []);

  const copyTrade = useCallback((trade: Trade, amountUsd: number) => {
    const position: SimulatedPosition = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tradeId: trade.id,
      traderId: trade.traderId,
      tokenSymbol: trade.tokenSymbol,
      tokenName: trade.tokenName,
      side: trade.side,
      amountUsd,
      entryPrice: trade.price,
      pnlPct: trade.pnlPct,
      createdAt: Date.now(),
    };
    setPositions((p) => [position, ...p]);
  }, []);

  const closePosition = useCallback((positionId: string) => {
    setPositions((p) => p.filter((pos) => pos.id !== positionId));
  }, []);

  const isFollowing = useCallback(
    (traderId: string) => followedIds.includes(traderId),
    [followedIds],
  );
  const isLiked = useCallback(
    (tradeId: string) => likedTradeIds.includes(tradeId),
    [likedTradeIds],
  );

  const value = useMemo<SocialTradingState>(
    () => ({
      followedIds,
      likedTradeIds,
      positions,
      toggleFollow,
      isFollowing,
      toggleLike,
      isLiked,
      copyTrade,
      closePosition,
    }),
    [
      followedIds,
      likedTradeIds,
      positions,
      toggleFollow,
      isFollowing,
      toggleLike,
      isLiked,
      copyTrade,
      closePosition,
    ],
  );

  return (
    <SocialTradingContext.Provider value={value}>
      {children}
    </SocialTradingContext.Provider>
  );
}

export function useSocialTrading(): SocialTradingState {
  const ctx = useContext(SocialTradingContext);
  if (!ctx) {
    throw new Error(
      'useSocialTrading must be used within SocialTradingProvider',
    );
  }
  return ctx;
}
