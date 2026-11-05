import { AnimationDuration } from '@metamask/design-tokens';
import { getHardwareTier } from '../../../../../util/deviceCapability';

/** Same token the design-system sheet uses for a regular transition. */
export const SHEET_HEIGHT_DURATION_MS = AnimationDuration.Regularly;

/** A flick coasts for this long, in seconds, after the finger lifts. */
const COAST_SECONDS = 0.25;
const MAX_EXPAND_SCROLL = 480;

/**
 * Height animation for the tab list. `0` on low-memory devices and when the
 * user prefers reduced motion, so the sheet jumps to its new height.
 * Unknown hardware is not treated as low.
 */
export const sheetHeightDuration = (prefersReducedMotion: boolean): number =>
  prefersReducedMotion || getHardwareTier() === 'LOW'
    ? 0
    : SHEET_HEIGHT_DURATION_MS;

/**
 * How far the sheet scrolls after an upward swipe opens the tabs.
 * `translationY` and `velocityY` are negative while the finger moves up.
 */
export const scrollOffsetForExpandSwipe = (
  translationY: number,
  velocityY: number,
): number => {
  const pulled = Math.max(0, -translationY);
  const coast =
    Math.max(0, -(Number.isFinite(velocityY) ? velocityY : 0)) * COAST_SECONDS;
  return Math.min(Math.round(pulled + coast), MAX_EXPAND_SCROLL);
};
