import type { Position } from '../controllers/types';
import { usePerpsPrices } from './usePerpsPrices';

/**
 * Hook for real-time P&L calculation for a specific position
 * Combines position data with live price updates
 */
export function usePositionPnL(position: Position): {
  currentPnL: number;
  currentPrice: number | null;
  pnlPercentage: number;
} {
  const prices = usePerpsPrices([position.coin]);
  const currentPrice = prices[position.coin]?.price ? parseFloat(prices[position.coin].price) : null;

  const currentPnL = currentPrice ?
    (currentPrice - parseFloat(position.entryPrice)) * parseFloat(position.size) :
    parseFloat(position.unrealizedPnl);

  const pnlPercentage = currentPrice ?
    ((currentPrice - parseFloat(position.entryPrice)) / parseFloat(position.entryPrice)) * 100 * Math.sign(parseFloat(position.size)) :
    0;

  return {
    currentPnL,
    currentPrice,
    pnlPercentage,
  };
}
