import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { wrapOffset } from './hotTokenRailMotion';

/** Slow news-footer crawl. */
const MARQUEE_PIXELS_PER_SECOND = 24;

interface UseRailCrawlOptions {
  /** One lap's length: the primary track's width. 0 until it is measured. */
  trackWidth: number;
  /** Whether the rail should be crawling right now. */
  enabled: boolean;
}

/**
 * The rail's news-ticker crawl.
 *
 * Native-driver timing writes the offset straight to the view, so a lap does
 * not commit the feed tree every frame the way a per-frame shared-value write
 * does. One timing runs per lap and JS wakes only at the wrap, which the
 * rail's loop copy hides.
 *
 * The native value is only readable asynchronously, so the position is
 * predicted on the JS clock for the places that need it at once: a press
 * placing its chip, and a stop resuming where it left off.
 */
export const useRailCrawl = ({ trackWidth, enabled }: UseRailCrawlOptions) => {
  const shift = useRef(new Animated.Value(0)).current;
  const translateX = useMemo(() => Animated.multiply(shift, -1), [shift]);
  const widthRef = useRef(trackWidth);
  widthRef.current = trackWidth;
  const enabledRef = useRef(enabled);
  const lapRef = useRef({ running: false, origin: 0, startedAt: 0 });
  // Where the rail sat when a drag began. Null while no drag is held.
  const dragOriginRef = useRef<number | null>(null);

  /** Where the crawl sits right now, in px. */
  const readOffset = useCallback(() => {
    const lap = lapRef.current;
    const width = widthRef.current;
    if (!lap.running || width <= 0) {
      return lap.origin;
    }
    const elapsedSeconds = (Date.now() - lap.startedAt) / 1000;
    return wrapOffset(
      lap.origin + MARQUEE_PIXELS_PER_SECOND * elapsedSeconds,
      width,
    );
  }, []);

  // `setValue` stops a running native timing, so placing the rail also stops it.
  const placeAt = useCallback(
    (position: number) => {
      lapRef.current = { running: false, origin: position, startedAt: 0 };
      shift.setValue(position);
    },
    [shift],
  );

  /** Parks the rail where it is and returns that position. */
  const stop = useCallback(() => {
    const position = readOffset();
    placeAt(position);
    return position;
  }, [placeAt, readOffset]);

  // A stopped timing ends with `finished: false`, so only a completed lap
  // starts the next one.
  const runFrom = useCallback(
    (from: number) => {
      const travel = (position: number) => {
        const width = widthRef.current;
        if (width <= 0) {
          return;
        }
        lapRef.current = {
          running: true,
          origin: position,
          startedAt: Date.now(),
        };
        shift.setValue(position);
        Animated.timing(shift, {
          toValue: width,
          duration: ((width - position) / MARQUEE_PIXELS_PER_SECOND) * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            travel(0);
          }
        });
      };
      travel(wrapOffset(from, widthRef.current));
    },
    [shift],
  );

  // A held drag owns the rail, so a relayout or a change of `enabled` cannot
  // restart the crawl under a finger. `release` picks it back up.
  useEffect(() => {
    enabledRef.current = enabled;
    if (dragOriginRef.current !== null) {
      return;
    }
    const position = stop();
    if (enabled) {
      runFrom(position);
    }
  }, [enabled, runFrom, stop, trackWidth]);

  useEffect(
    () => () => {
      shift.stopAnimation();
    },
    [shift],
  );

  /** A finger lands: park the rail and remember where the drag began. */
  const hold = useCallback(() => {
    dragOriginRef.current = stop();
  }, [stop]);

  /** Scrubs the rail `dx` px against where the drag began. */
  const scrubBy = useCallback(
    (dx: number) => {
      const origin = dragOriginRef.current;
      const width = widthRef.current;
      if (origin === null || width <= 0) {
        return;
      }
      placeAt(wrapOffset(origin - dx, width));
    },
    [placeAt],
  );

  /** The finger lifts: the crawl resumes from the scrubbed position. */
  const release = useCallback(() => {
    dragOriginRef.current = null;
    const position = stop();
    if (enabledRef.current) {
      runFrom(position);
    }
  }, [runFrom, stop]);

  return { translateX, readOffset, hold, scrubBy, release };
};
