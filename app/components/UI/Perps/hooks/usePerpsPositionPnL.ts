import { useMemo } from 'react';
import type { Position } from '../controllers/types';
import { usePerpsPrices } from './usePerpsPrices';
import { calculatePnLWithPercentage } from '../utils/pnlCalculations';

/**
 * Hook for real-time P&L calculation for a specific position
 */
export function usePerpsPositionPnL(position: Position): {
  currentPnL: number;
  currentPrice: number | null;
  pnlPercentage: number;
} {
  const prices = usePerpsPrices([position.coin]);

  const parsedPosition = useMemo(() => ({
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
    unrealizedPnl: parseFloat(position.unrealizedPnl),
  }), [position.entryPrice, position.size, position.unrealizedPnl]);

  const currentPrice = useMemo(() => {
    const priceData = prices[position.coin];
    return priceData?.price ? parseFloat(priceData.price) : null;
  }, [prices, position.coin]);

  return useMemo(() => {
    if (!currentPrice) {
      return {
        currentPnL: parsedPosition.unrealizedPnl,
        currentPrice,
        pnlPercentage: 0,
      };
    }

    const { pnl, pnlPercentage } = calculatePnLWithPercentage({
      entryPrice: parsedPosition.entryPrice,
      currentPrice,
      size: parsedPosition.size,
    });

    return {
      currentPnL: pnl,
      currentPrice,
      pnlPercentage,
    };
  }, [currentPrice, parsedPosition]);
}
