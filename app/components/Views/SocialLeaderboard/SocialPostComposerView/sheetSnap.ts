export type SheetStop = 'default' | 'tall';

export type SheetSnapTarget = SheetStop | 'dismiss';

export type SheetDragDirection = 'up' | 'down';

/**
 * Edge drag strips. They overlay the sheet's 16px content padding so the
 * swipe target does not add a second inset.
 */
export const SHEET_EDGE_STRIP_WIDTH = 16;

/**
 * The design-system handle stays in the layout when the sheet pan is off
 * (`p-1` + `h-1` + `p-1`). The visible handle overlaps that slot.
 */
export const HIDDEN_HANDLE_SLOT = 12;

/** Downward or upward speed that commits the drag without crossing the midpoint. */
export const SHEET_FLING_VELOCITY = 800;

export const SHEET_SNAP_DURATION_MS = 180;

const HEIGHT_EPSILON = 1;

export interface ResolveSheetSnapInput {
  stop: SheetStop;
  direction: SheetDragDirection;
  passedMidpoint: boolean;
  isFling: boolean;
  defaultIsTallCap: boolean;
}

export interface SheetMidpointInput {
  stop: SheetStop;
  direction: SheetDragDirection;
  /** Finger travel from the gesture start. Positive is downward. */
  translationY: number;
  defaultHeight: number;
  tallHeight: number;
}

export function gifDefaultHeight(windowHeight: number): number {
  'worklet';
  return Math.max(280, Math.round(windowHeight * 0.42));
}

/**
 * Inner height of the tall stop. The design-system sheet adds the bottom
 * safe-area padding under this content, so the padding is removed here and
 * the outer sheet stays within 90% of the window and the sheet maximum.
 */
export function tallSheetHeight(
  windowHeight: number,
  topInset: number,
  bottomInset: number,
): number {
  'worklet';
  const outerCap = Math.min(
    Math.round(windowHeight * 0.9),
    Math.max(0, windowHeight - topInset),
  );
  return Math.max(0, outerCap - bottomInset);
}

export function isDefaultAtTallCap(
  defaultHeight: number,
  tallHeight: number,
): boolean {
  'worklet';
  return defaultHeight >= tallHeight - HEIGHT_EPSILON;
}

export function sheetDragDirection(
  translationY: number,
  velocityY: number,
): { direction: SheetDragDirection; isFling: boolean } {
  'worklet';
  const isFling = Math.abs(velocityY) >= SHEET_FLING_VELOCITY;
  if (isFling) {
    return { direction: velocityY < 0 ? 'up' : 'down', isFling };
  }
  if (translationY < 0) {
    return { direction: 'up', isFling: false };
  }
  return { direction: 'down', isFling: false };
}

export function didPassSheetMidpoint({
  stop,
  direction,
  translationY,
  defaultHeight,
  tallHeight,
}: SheetMidpointInput): boolean {
  'worklet';
  const atCap = isDefaultAtTallCap(defaultHeight, tallHeight);
  if (direction === 'up') {
    if (stop === 'tall' || atCap) {
      return false;
    }
    return -translationY > (tallHeight - defaultHeight) / 2;
  }

  if (stop === 'tall' && !atCap) {
    return translationY > (tallHeight - defaultHeight) / 2;
  }

  const sheetHeight = Math.min(Math.max(defaultHeight, 0), tallHeight);
  return translationY > sheetHeight / 2;
}

export function resolveSheetSnap({
  stop,
  direction,
  passedMidpoint,
  isFling,
  defaultIsTallCap,
}: ResolveSheetSnapInput): SheetSnapTarget {
  'worklet';
  const commits = isFling || passedMidpoint;

  if (defaultIsTallCap) {
    if (direction === 'down' && commits) {
      return 'dismiss';
    }
    return stop;
  }

  if (stop === 'tall') {
    if (direction === 'down' && commits) {
      return 'default';
    }
    return 'tall';
  }

  if (direction === 'up' && commits) {
    return 'tall';
  }
  if (direction === 'down' && commits) {
    return 'dismiss';
  }
  return 'default';
}
