import type { AppStackNavigationProp } from '../../core/NavigationService/types';

/**
 * Delay, in ms, after which the screen is treated as settled when the navigator
 * never emits `transitionEnd` — the screen is the initial route, its animation
 * is disabled, or it is not rendered inside a native stack. Comfortably longer
 * than the native push animation so it only acts as a safety net.
 */
export const SCREEN_TRANSITION_FALLBACK_MS = 450;

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
 * @returns An unsubscribe that clears the fallback and both listeners.
 */
export function subscribeScreenTransition(
  navigation: AppStackNavigationProp,
  onComplete: () => void,
): () => void {
  let fallbackTimeout: ReturnType<typeof setTimeout>;

  const armFallback = () => {
    clearTimeout(fallbackTimeout);
    fallbackTimeout = setTimeout(() => {
      if (navigation.isFocused()) {
        onComplete();
      }
    }, SCREEN_TRANSITION_FALLBACK_MS);
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
