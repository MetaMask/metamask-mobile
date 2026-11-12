import type { SliceKey } from './types';

/** Ordered sequence for homepage aggregation and display */
export const SLICE_ORDER: SliceKey[] = [
  'money',
  'tokens',
  'perps',
  'predict',
  'defi',
  'collectibles',
];

export const PERPS_HOMEPAGE_THROTTLE_MS = 1000;
