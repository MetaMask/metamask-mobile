import { RefObject, useCallback, useEffect, useRef } from 'react';
import type { RiveRef } from 'rive-react-native';

/** How long to wait for Rive's `onPlay` before firing the reveal anyway. */
export const RIVE_REVEAL_FALLBACK_DELAY_MS = 400;

interface UseRiveRevealTriggerOptions {
  riveRef: RefObject<RiveRef | null>;
  /** ViewModel trigger that starts the reveal. */
  triggerName: string;
  /** Whether the reveal should run at all; false while the view is unmounted. */
  enabled: boolean;
  /** Artboard currently mounted; a change remounts the native view. */
  artboardName: string;
  /** Delay between the view being ready and the trigger firing. */
  delayMs?: number;
  log: (message: string) => void;
}

/**
 * Fires a data-bound reveal trigger once the native view can receive it.
 *
 * The trigger only lands once the view has loaded the file, and `onPlay` is
 * that signal — firing from an effect alone races the load, and the runtime
 * drops such a dispatch silently instead of reporting it. `onPlay` is not
 * guaranteed to arrive either: when the state machine settles without starting
 * playback it never fires, so a fallback timer attempts the reveal anyway.
 *
 * Because that early attempt cannot be confirmed, it does not consume the
 * reveal: `onPlay` may still dispatch once afterwards. Only a dispatch made on
 * the load signal is final, so a slow file load costs at most a repeated
 * trigger rather than an entrance that never plays.
 *
 * Returns the `onPlay` handler to pass to `<Rive>`.
 */
export function useRiveRevealTrigger({
  riveRef,
  triggerName,
  enabled,
  artboardName,
  delayMs = 0,
  log,
}: UseRiveRevealTriggerOptions): () => void {
  const hasRevealedOnLoad = useRef(false);
  const hasRevealedEarly = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The native view is replaced when the artboard changes or when it is
  // remounted after being disabled, and the fresh view has not been revealed.
  useEffect(() => {
    hasRevealedOnLoad.current = false;
    hasRevealedEarly.current = false;
  }, [artboardName, enabled]);

  const fireReveal = useCallback(
    (isLoaded: boolean) => {
      if (hasRevealedOnLoad.current) return;
      if (!isLoaded && hasRevealedEarly.current) return;
      if (isLoaded) {
        hasRevealedOnLoad.current = true;
      } else {
        hasRevealedEarly.current = true;
      }

      const dispatchTrigger = () => {
        const rive = riveRef.current;
        // viewTag() is null while the native view is detached; dispatching then
        // throws "found null reactTag".
        if (!rive || rive.viewTag() === null) {
          log('reveal skipped: native view detached');
          return;
        }
        rive.trigger(triggerName);
      };

      if (delayMs > 0) {
        clearTimeout(timeout.current);
        timeout.current = setTimeout(dispatchTrigger, delayMs);
        return;
      }
      dispatchTrigger();
    },
    [riveRef, triggerName, delayMs, log],
  );

  useEffect(() => () => clearTimeout(timeout.current), []);

  // The trigger only lands once the file is loaded, and a dispatch made before
  // that is silently dropped by the runtime rather than reported. So the
  // fallback's attempt does not close the door: `onPlay` — the actual load
  // signal — is still allowed to dispatch once afterwards.
  useEffect(() => {
    if (!enabled) return undefined;
    const fallback = setTimeout(
      () => fireReveal(false),
      RIVE_REVEAL_FALLBACK_DELAY_MS,
    );
    return () => clearTimeout(fallback);
  }, [enabled, fireReveal]);

  return useCallback(() => {
    if (enabled) fireReveal(true);
  }, [enabled, fireReveal]);
}
