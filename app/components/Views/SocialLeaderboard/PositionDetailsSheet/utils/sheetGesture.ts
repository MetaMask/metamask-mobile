import { Platform } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';

/** Share of the window the open sheet covers, leaving the screen behind visible. */
export const SHEET_HEIGHT_RATIO = 0.9;

/**
 * Movement before a drag outside the chart picks an axis. Downward drags the
 * sheet. Sideways and upward stay with whatever is under the finger.
 */
export const GESTURE_DIRECTION_LOCK = 10;

/** Horizontal travel that claims a chart scrub. */
export const CHART_SCRUB_ACTIVATION = 8;

/**
 * Vertical travel must be at least this many times the horizontal travel
 * before a chart touch scrolls or dismisses. A tie goes to the vertical swipe.
 */
export const CHART_VERTICAL_RATIO = 2;

/** Vertical travel that releases a chart touch to scroll or the sheet. */
export const CHART_VERTICAL_RELEASE =
  CHART_SCRUB_ACTIVATION * CHART_VERTICAL_RATIO;

export type ChartAreaDecision = 'pending' | 'scrub' | 'sheet' | 'scroll';

export type SheetTouchDecision = 'pending' | 'drag' | 'fail';

/**
 * Decides a touch that began on the chart. Anything short of a straight
 * vertical swipe scrubs. Once decided, the caller keeps that choice.
 */
export function resolveChartAreaTouch(
  dx: number,
  dy: number,
  scrollAtTop: boolean,
): ChartAreaDecision {
  'worklet';
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absY >= CHART_VERTICAL_RELEASE && absY >= CHART_VERTICAL_RATIO * absX) {
    return dy > 0 && scrollAtTop ? 'sheet' : 'scroll';
  }
  if (absX >= CHART_SCRUB_ACTIVATION) return 'scrub';
  return 'pending';
}

/** Decides a touch that began outside the chart. */
export function resolveSheetTouch(dx: number, dy: number): SheetTouchDecision {
  'worklet';
  if (dy >= GESTURE_DIRECTION_LOCK) return 'drag';
  if (dy <= -GESTURE_DIRECTION_LOCK || Math.abs(dx) >= GESTURE_DIRECTION_LOCK) {
    return 'fail';
  }
  return 'pending';
}

/**
 * Sheet-side decision for one touch. On the chart, only a straight downward
 * swipe at the top of the list drags the sheet. Every other chart touch is
 * left to the scrub or the list.
 */
export function resolveSheetDrag(
  dx: number,
  dy: number,
  touchInChart: boolean,
  scrollAtTop: boolean,
): SheetTouchDecision {
  'worklet';
  if (!touchInChart) return resolveSheetTouch(dx, dy);
  const decision = resolveChartAreaTouch(dx, dy, scrollAtTop);
  if (decision === 'sheet') return 'drag';
  if (decision === 'pending') return 'pending';
  return 'fail';
}

/** Downward release speed (pt/s) that dismisses even after a short drag. */
export const SHEET_FLICK_VELOCITY = 1000;

/** Share of the sheet that has to be dragged off screen to dismiss on release. */
export const SHEET_DISMISS_DISTANCE_RATIO = 0.25;

/**
 * Critically damped, so open, spring-back and dismiss settle without a
 * bounce. The release velocity is added per call.
 */
export const SHEET_SPRING: WithSpringConfig = {
  damping: 36,
  stiffness: 360,
  mass: 1,
  overshootClamping: true,
};

/** Drag handle: padding, the bar, padding. */
const SHEET_HANDLE_HEIGHT = 12;
/** Trader row: vertical padding, the follow button, and the divider. */
const SHEET_HEADER_HEIGHT = 57;
/** Pinned action: padding and the large button. */
const SHEET_FOOTER_HEIGHT = 84;
const ANDROID_BOTTOM_PADDING = 16;

/** Never taller than the space under the status bar. */
export const getSheetHeight = (
  windowHeight: number,
  topInset: number,
): number =>
  Math.max(
    0,
    Math.min(windowHeight * SHEET_HEIGHT_RATIO, windowHeight - topInset),
  );

/**
 * Height of the scrolling area between the trader row and the pinned action.
 * The tab labels sit at the bottom of it, so the lists start just off screen.
 */
export const getScrollViewportHeight = (
  windowHeight: number,
  topInset: number,
  bottomInset: number,
  hasFooter: boolean,
): number => {
  const paddingBottom =
    Platform.OS === 'android'
      ? bottomInset + ANDROID_BOTTOM_PADDING
      : bottomInset;
  const chrome =
    SHEET_HANDLE_HEIGHT +
    SHEET_HEADER_HEIGHT +
    paddingBottom +
    (hasFooter ? SHEET_FOOTER_HEIGHT : 0);
  return Math.max(0, getSheetHeight(windowHeight, topInset) - chrome);
};

export interface SheetReleaseParams {
  /** How far the sheet is dragged down, in points. */
  offset: number;
  velocityY: number;
  sheetHeight: number;
  /** False when the drag began on a scrolled list, so a flick only scrolls. */
  canFlickDismiss: boolean;
}

/** Decides on release whether the sheet dismisses or springs back. */
export function shouldDismissSheet({
  offset,
  velocityY,
  sheetHeight,
  canFlickDismiss,
}: SheetReleaseParams): boolean {
  'worklet';
  if (offset <= 0 || velocityY < -SHEET_FLICK_VELOCITY) return false;
  if (canFlickDismiss && velocityY > SHEET_FLICK_VELOCITY) return true;
  return offset > sheetHeight * SHEET_DISMISS_DISTANCE_RATIO;
}
