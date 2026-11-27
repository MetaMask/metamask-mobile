/**
 * Neutral window clock: math, shared clock, progress ring and live badge for a
 * timed window described by `{ startsAt, endsAt }`.
 *
 * The legacy Up/Down card and PredictNext both import from this folder.
 * Do not import `PredictMarket` here.
 */
export {
  formatWindowCountdown,
  getAlignedWindowStartMs,
  getWindowDurationMs,
  getWindowProgressRemaining,
  getWindowTimeRemainingMs,
} from './windowClock';
export type { WindowClockInput } from './windowClock';
export {
  __resetCardClockForTest,
  useSharedBucketedNowMs,
  useSharedNowMs,
  useSharedSeriesWindowMs,
} from './sharedClock';
export { default as LiveStatus } from './LiveStatus';
export type { LiveStatusProps } from './LiveStatus';
export { default as ProgressLogo } from './ProgressLogo';
export type { ProgressLogoProps } from './ProgressLogo';
// Already neutral (takes an ISO string). It stays in place because
// `TimeSlotPicker.test.tsx` mocks `./useCountdown` by path.
export { useCountdown } from '../components/TimeSlotPicker/useCountdown';
