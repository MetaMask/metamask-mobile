import type { PerpsMiniState, Position, Side } from './PerpsMini';

export const selectPosition = (
  state: PerpsMiniState,
  symbol: string,
): Position | undefined => state.positions[symbol];

export const selectPositionSide = (
  state: PerpsMiniState,
  symbol: string,
): Side | 'flat' => state.positions[symbol]?.side ?? 'flat';

export const selectPositionValueUsd = (
  state: PerpsMiniState,
  symbol: string,
): number => {
  const p = state.positions[symbol];
  return p ? p.size * p.markPrice : 0;
};

export const selectOpenSymbols = (state: PerpsMiniState): string[] =>
  Object.keys(state.positions);
