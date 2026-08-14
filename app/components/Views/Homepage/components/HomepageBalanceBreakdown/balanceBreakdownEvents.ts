import type { SliceKey } from '../../BalanceBreakdown/types';

export const BalanceBreakdownEventProperties = {
  Slice: 'slice',
  Source: 'source',
} as const;

export const BalanceBreakdownEventSource = {
  Homepage: 'homepage',
} as const;

export type BalanceBreakdownEventSlice = SliceKey;
