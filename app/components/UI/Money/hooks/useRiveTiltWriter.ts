import { RefObject, useCallback, useEffect, useRef } from 'react';
import type { RiveRef } from 'rive-react-native';
import { RIVE_TILT_WRITE_EPSILON } from '../utils/parallax';

interface UseRiveTiltWriterOptions {
  riveRef: RefObject<RiveRef | null>;
  /** ViewModel number driving the horizontal axis. */
  xProperty: string;
  /** ViewModel number driving the vertical axis. */
  yProperty: string;
  /** Artboard currently mounted; a change remounts the native view. */
  artboardName: string;
  /** Whether the Rive view is mounted at all. */
  enabled: boolean;
}

/**
 * Writes a tilt to a Rive artboard, skipping writes too small to be seen.
 *
 * `RiveRef.setNumber` resolves a node handle and dispatches a view manager
 * command per call, so driving two axes from the accelerometer costs two of
 * those per sample — and a device lying still still produces a full sample
 * stream, every value of it identical to the last. Holding the last value
 * written per axis turns that steady state into no work at all, and leaves the
 * dispatch rate while actually tilting unchanged.
 *
 * The cache is per native view, so it is dropped whenever that view is
 * replaced: a fresh artboard starts at its own rest pose, and a stale cache
 * would suppress the write that puts it back where the device is pointing.
 */
export function useRiveTiltWriter({
  riveRef,
  xProperty,
  yProperty,
  artboardName,
  enabled,
}: UseRiveTiltWriterOptions): (x: number, y: number) => void {
  const lastWritten = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    lastWritten.current = null;
  }, [artboardName, enabled]);

  return useCallback(
    (x: number, y: number) => {
      const rive = riveRef.current;
      // viewTag() is null while the native Rive view is detached; dispatching
      // then throws "found null reactTag".
      if (!rive || rive.viewTag() === null) return;

      const previous = lastWritten.current;
      const written = { x: previous?.x ?? x, y: previous?.y ?? y };

      if (!previous || Math.abs(x - previous.x) >= RIVE_TILT_WRITE_EPSILON) {
        rive.setNumber(xProperty, x);
        written.x = x;
      }
      if (!previous || Math.abs(y - previous.y) >= RIVE_TILT_WRITE_EPSILON) {
        rive.setNumber(yProperty, y);
        written.y = y;
      }

      lastWritten.current = written;
    },
    [riveRef, xProperty, yProperty],
  );
}
