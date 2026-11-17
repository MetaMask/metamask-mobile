import type { AppStackNavigationProp } from '../../core/NavigationService/types';

/**
 * Delay, in ms, after which the screen is treated as settled when the navigator
 * never emits `transitionEnd` — the screen is the initial route, its animation
 * is disabled, or it is not rendered inside a native stack. Comfortably longer
 * than the native push animation so it only acts as a safety net.
 */
export const SCREEN_TRANSITION_FALLBACK_MS = 450;

/** Options for {@link subscribeScreenTransition}. */
export interface SubscribeScreenTransitionOptions {
  /**
   * Override the safety net. Only lower it when the navigator is known to emit
   * `transitionEnd` reliably; a screen that never emits it shows its
   * placeholder for this long.
   * @default SCREEN_TRANSITION_FALLBACK_MS
   */
  fallbackMs?: number;
}

/**
 * Calls `onComplete` once the screen's enter animation has finished, so callers
 * can hold back work that competes with it.
 *
 * Falls back to {@link SCREEN_TRANSITION_FALLBACK_MS} so `onComplete` still
 * runs when no `transitionEnd` event is emitted, as long as the screen is
 * focused when the fallback fires. A screen that regains focus re-arms it.
 *
 * `onComplete` may run more than once; callers that need a single release
 * guard against that themselves.
 *
 * @param navigation - The screen's navigation object.
 * @param onComplete - Called when the transition has ended or the fallback has
 * elapsed on a focused screen.
 * @param options - Optional override for the fallback delay.
 * @returns An unsubscribe that clears the fallback and both listeners.
 */
export function subscribeScreenTransition(
  navigation: AppStackNavigationProp,
  onComplete: () => void,
  {
    fallbackMs = SCREEN_TRANSITION_FALLBACK_MS,
  }: SubscribeScreenTransitionOptions = {},
): () => void {
  let fallbackTimeout: ReturnType<typeof setTimeout>;

  const armFallback = () => {
    clearTimeout(fallbackTimeout);
    fallbackTimeout = setTimeout(() => {
      if (navigation.isFocused()) {
        onComplete();
      }
    }, fallbackMs);
  };

  armFallback();

  const unsubscribeFocus = navigation.addListener('focus', armFallback);
  const unsubscribeTransition = navigation.addListener(
    'transitionEnd',
    (event) => {
      // `closing` belongs to the screen leaving the stack.
      if (event.data.closing) {
        return;
      }
      clearTimeout(fallbackTimeout);
      onComplete();
    },
  );

  return () => {
    clearTimeout(fallbackTimeout);
    unsubscribeFocus();
    unsubscribeTransition();
  };
}
