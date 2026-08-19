import { useEffect, useRef } from 'react';
import type { RiveViewRef, ViewModelInstance } from '@rive-app/react-native';

interface UseRiveRevealTriggerOptions {
  /** Bound view model instance; `null` while the file or binding loads. */
  instance: ViewModelInstance | null;
  /** Native view methods; set only after the view resolves awaitViewReady. */
  riveViewRef: RiveViewRef | null | undefined;
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
 * The reveal only advances once the view model instance is bound to the
 * running state machine — firing before the native view is ready would be
 * silently dropped. Unlike the legacy runtime, Nitro exposes both readiness
 * signals directly: `instance` is non-null once data binding has resolved,
 * and `riveViewRef` is non-null once the native view has loaded. Gating on
 * both replaces the legacy `onPlay`-plus-fallback-timer contract; a late
 * signal retries the effect instead of dropping the trigger.
 *
 * The reveal fires once per mounted view: the latch resets when the artboard
 * changes (which remounts the native view) or when `enabled` toggles.
 */
export function useRiveRevealTrigger({
  instance,
  riveViewRef,
  triggerName,
  enabled,
  artboardName,
  delayMs = 0,
  log,
}: UseRiveRevealTriggerOptions): void {
  const hasFiredReveal = useRef(false);

  // The native view is replaced when the artboard changes or when it is
  // remounted after being disabled, and the fresh view has not been revealed.
  useEffect(() => {
    hasFiredReveal.current = false;
  }, [artboardName, enabled]);

  useEffect(() => {
    if (!enabled || !instance || !riveViewRef || hasFiredReveal.current) {
      return undefined;
    }

    const dispatchTrigger = () => {
      hasFiredReveal.current = true;
      const trigger = instance.triggerProperty(triggerName);
      if (!trigger) {
        log('reveal skipped: trigger property not found');
        return;
      }
      trigger.trigger();
      // A settled state machine won't be advancing when the trigger lands;
      // playIfNeeded is the runtime's low-overhead way to wake it.
      riveViewRef.playIfNeeded();
    };

    // The latch is set inside dispatchTrigger, so unmounting during the delay
    // cancels the timer without consuming the reveal.
    if (delayMs > 0) {
      const timeout = setTimeout(dispatchTrigger, delayMs);
      return () => clearTimeout(timeout);
    }
    dispatchTrigger();
    return undefined;
  }, [enabled, instance, riveViewRef, triggerName, delayMs, log]);
}
