import { useEffect } from 'react';
import type { Position } from '@metamask/perps-controller';

interface UsePerpsFreshRemovalLimitParams {
  /** Safe max from a fresh read that stopped a removal, or null. */
  freshMaxAmount: number | null;
  setFreshMaxAmount: (amount: number | null) => void;
  position: Position | null;
  /** Floored max from the live snapshot. */
  snapshotMaxAmount: number;
  exchangeMaxAmount: number;
  isAddMode: boolean;
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

/**
 * Keeps a remove-margin form within the limit a fresh read returned after it
 * stopped a removal, until the stream catches up to it or the position itself
 * changes. The stream re-sends positions on every PnL tick, so only size,
 * entry and leverage count as a change.
 *
 * @param params - Fresh limit state, live position and snapshot limits.
 * @returns The max offered by Max/slider and the limit submissions are checked against.
 */
export const usePerpsFreshRemovalLimit = ({
  freshMaxAmount,
  setFreshMaxAmount,
  position,
  snapshotMaxAmount,
  exchangeMaxAmount,
  isAddMode,
}: UsePerpsFreshRemovalLimitParams) => {
  const positionShape = position
    ? `${position.size}|${position.entryPrice}|${position.leverage?.value}`
    : '';
  useEffect(() => {
    setFreshMaxAmount(null);
  }, [positionShape, setFreshMaxAmount]);
  useEffect(() => {
    if (freshMaxAmount !== null && snapshotMaxAmount <= freshMaxAmount) {
      setFreshMaxAmount(null);
    }
  }, [snapshotMaxAmount, freshMaxAmount, setFreshMaxAmount]);

  const capToFreshMax = (amount: number) =>
    freshMaxAmount === null || isAddMode
      ? amount
      : Math.min(amount, freshMaxAmount);
  const flooredMaxAmount = capToFreshMax(snapshotMaxAmount);
  // Validate against what the exchange accepts, not the headroom-reduced max
  // offered by Max/slider, so a price tick after choosing Max does not block it.
  const submitLimitAmount = capToFreshMax(
    Number.isFinite(exchangeMaxAmount) && exchangeMaxAmount > flooredMaxAmount
      ? floorUsd(exchangeMaxAmount)
      : flooredMaxAmount,
  );

  return { flooredMaxAmount, submitLimitAmount };
};
