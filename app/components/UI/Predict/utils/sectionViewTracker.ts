/**
 * Section view tracking core (framework-agnostic).
 *
 * Powers `usePredictSectionImpressions`. Kept free of React/Reanimated so all
 * visibility + dwell logic is plain, deterministically unit-testable JS. The
 * hook is thin glue that feeds layout / viewport / scroll updates in and
 * forwards the `onViewed` callback out.
 */

/** A section fires "viewed" once it is at least this ratio visible. */
export const DEFAULT_VISIBILITY_THRESHOLD = 0.5;
/** ...and stays that visible for at least this long (ms). Filters scroll-pasts. */
export const DEFAULT_DWELL_MS = 500;

export interface SectionLayout {
  /** Top offset of the section within the scroll content. */
  top: number;
  /** Measured section height. */
  height: number;
}

export interface SectionViewTrackerOptions {
  onViewed: (sectionId: string) => void;
  threshold?: number;
  dwellMs?: number;
}

export interface SectionViewTracker {
  setViewportHeight: (height: number) => void;
  setLayout: (sectionId: string, layout: SectionLayout) => void;
  setScrollY: (scrollY: number) => void;
  /** Clears fired ids + pending dwell timers so re-entering can re-fire. */
  reset: () => void;
  /** Clears pending timers without clearing fired ids (unmount teardown). */
  destroy: () => void;
}

/**
 * Fraction of a section that is inside the scroll viewport, clamped to [0, 1].
 *
 * The denominator is `min(height, viewportHeight)` so a section taller than the
 * viewport reaches 1 once it fully fills the viewport (rather than being
 * impossible to ever consider "visible enough").
 */
export const computeSectionVisibleRatio = (
  top: number,
  height: number,
  scrollY: number,
  viewportHeight: number,
): number => {
  if (height <= 0 || viewportHeight <= 0) {
    return 0;
  }

  const visibleTop = Math.max(top, scrollY);
  const visibleBottom = Math.min(top + height, scrollY + viewportHeight);
  const visible = Math.max(0, visibleBottom - visibleTop);

  const denominator = Math.min(height, viewportHeight);
  const ratio = visible / denominator;

  return Math.max(0, Math.min(1, ratio));
};

/**
 * Creates a stateful tracker that fires `onViewed(sectionId)` exactly once per
 * section (until `reset`) after the section has been >= `threshold` visible for
 * >= `dwellMs`. Scrolling a section back below the threshold cancels its
 * pending dwell timer.
 */
export const createSectionViewTracker = ({
  onViewed,
  threshold = DEFAULT_VISIBILITY_THRESHOLD,
  dwellMs = DEFAULT_DWELL_MS,
}: SectionViewTrackerOptions): SectionViewTracker => {
  const layouts = new Map<string, SectionLayout>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const fired = new Set<string>();
  let viewportHeight = 0;
  let scrollY = 0;

  const clearTimer = (sectionId: string) => {
    const timer = timers.get(sectionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(sectionId);
    }
  };

  const evaluate = () => {
    if (viewportHeight <= 0) {
      return;
    }

    layouts.forEach(({ top, height }, sectionId) => {
      if (fired.has(sectionId)) {
        return;
      }

      const ratio = computeSectionVisibleRatio(
        top,
        height,
        scrollY,
        viewportHeight,
      );
      const isVisible = ratio >= threshold;

      if (isVisible) {
        // Already counting down; let the existing timer run.
        if (timers.has(sectionId)) {
          return;
        }
        const timer = setTimeout(() => {
          timers.delete(sectionId);
          fired.add(sectionId);
          onViewed(sectionId);
        }, dwellMs);
        timers.set(sectionId, timer);
      } else {
        // Scrolled away before the dwell completed — cancel.
        clearTimer(sectionId);
      }
    });
  };

  return {
    setViewportHeight: (height: number) => {
      viewportHeight = height;
      evaluate();
    },
    setLayout: (sectionId: string, layout: SectionLayout) => {
      layouts.set(sectionId, layout);
      evaluate();
    },
    setScrollY: (nextScrollY: number) => {
      scrollY = nextScrollY;
      evaluate();
    },
    reset: () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      fired.clear();
      // Re-evaluate immediately so sections already in the viewport at the
      // current scroll position start their dwell timers without requiring a
      // scroll event (which won't fire if the user returns at scrollY=0).
      evaluate();
    },
    destroy: () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
  };
};
