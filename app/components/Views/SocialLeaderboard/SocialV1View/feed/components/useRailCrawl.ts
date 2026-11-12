import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import {
  driftOffset,
  RAIL_DRIFT_DECELERATION,
  RAIL_DRIFT_MIN_VELOCITY,
  RAIL_DRIFT_WRAP_LAPS,
  wrapOffset,
} from './hotTokenRailMotion';

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
 * A flick coasts on the UIScrollView deceleration curve, then the crawl
 * resumes. A coast against the crawl runs backward and eases to a stop
 * first; the crawl then picks up in its own direction.
 *
 * The native value is only readable asynchronously, so the position is
 * predicted on the JS clock for the places that need it at once: a press
 * placing its chip, and a stop resuming where it left off.
 */
export const useRailCrawl = ({ trackWidth, enabled }: UseRailCrawlOptions) => {
  const shift = useRef(new Animated.Value(0)).current;
  // The translation wraps so a coast past either end of a lap stays on the
  // loop copy. Native modulo keeps a negative sign, so the offset is shifted
  // up by several laps before it wraps.
  const translateX = useMemo(() => {
    if (trackWidth <= 0) {
      return Animated.multiply(shift, -1);
    }
    const wrapped = Animated.modulo(
      Animated.add(shift, trackWidth * RAIL_DRIFT_WRAP_LAPS),
      trackWidth,
    );
    return Animated.multiply(wrapped, -1);
  }, [shift, trackWidth]);
  const widthRef = useRef(trackWidth);
  widthRef.current = trackWidth;
  const enabledRef = useRef(enabled);
  const motionRef = useRef<
    | { kind: 'rest'; origin: number }
    | { kind: 'crawl'; origin: number; startedAt: number }
    | { kind: 'drift'; origin: number; velocity: number; startedAt: number }
  >({ kind: 'rest', origin: 0 });
  // Where the rail sat when a drag began. Null while no drag is held.
  const dragOriginRef = useRef<number | null>(null);

  /** Where the rail sits right now, in px. */
  const readOffset = useCallback(() => {
    const motion = motionRef.current;
    const width = widthRef.current;
    if (motion.kind === 'crawl' && width > 0) {
      const elapsedSeconds = (Date.now() - motion.startedAt) / 1000;
      return wrapOffset(
        motion.origin + MARQUEE_PIXELS_PER_SECOND * elapsedSeconds,
        width,
      );
    }
    if (motion.kind === 'drift' && width > 0) {
      const elapsedMs = Date.now() - motion.startedAt;
      return wrapOffset(
        driftOffset(motion.origin, motion.velocity, elapsedMs),
        width,
      );
    }
    return motion.origin;
  }, []);

  // `setValue` stops a running native animation, so placing the rail also stops it.
  const placeAt = useCallback(
    (position: number) => {
      motionRef.current = { kind: 'rest', origin: position };
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
        motionRef.current = {
          kind: 'crawl',
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
  // restart the crawl under a finger. `release` picks it back up. A coast
  // does not: docking a chip parks the rail where the coast has reached.
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

  /**
   * The finger lifts. A flick keeps its speed and eases to rest, then the
   * crawl resumes. `velocityX` is the gesture's points per second, positive
   * when the finger moves right. A second call, from the gesture ending
   * after the flick already started, does nothing.
   */
  const release = useCallback(
    (velocityX = 0) => {
      if (dragOriginRef.current === null) {
        return;
      }
      dragOriginRef.current = null;
      const position = stop();
      const width = widthRef.current;
      if (width <= 0 || Math.abs(velocityX) < RAIL_DRIFT_MIN_VELOCITY) {
        if (enabledRef.current) {
          runFrom(position);
        }
        return;
      }
      // Decay wants pixels per millisecond. Finger-right decreases the offset.
      const velocity = -velocityX / 1000;
      motionRef.current = {
        kind: 'drift',
        origin: position,
        velocity,
        startedAt: Date.now(),
      };
      shift.setValue(position);
      Animated.decay(shift, {
        velocity,
        deceleration: RAIL_DRIFT_DECELERATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || motionRef.current.kind !== 'drift') {
          return;
        }
        const coasted = readOffset();
        if (enabledRef.current) {
          runFrom(coasted);
          return;
        }
        placeAt(coasted);
      });
    },
    [placeAt, readOffset, runFrom, shift, stop],
  );

  return { translateX, readOffset, hold, scrubBy, release };
};
