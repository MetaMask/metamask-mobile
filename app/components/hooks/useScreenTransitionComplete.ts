import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import type { AppStackNavigationProp } from '../../core/NavigationService/types';

/**
 * Delay, in ms, after which the screen is treated as settled when the navigator
 * never emits `transitionEnd` — the screen is the initial route, its animation
 * is disabled, or it is not rendered inside a native stack. Comfortably longer
 * than the native push animation so it only acts as a safety net.
 */
export const SCREEN_TRANSITION_FALLBACK_MS = 450;

/**
 * Tracks whether the screen's enter animation has finished, so callers can hold
 * back work that competes with it: showing the keyboard, or mounting an
 * expensive subtree. On iOS the keyboard paints its translucent background from
 * whatever sits behind it, so opening it mid-push makes it flash dark grey
 * before settling.
 *
 * Falls back to {@link SCREEN_TRANSITION_FALLBACK_MS} so the value always
 * becomes `true`, even when no `transitionEnd` event is emitted.
 *
 * @returns `true` once the transition has ended or the fallback has elapsed.
 */
export function useScreenTransitionComplete(): boolean {
  const navigation = useNavigation<AppStackNavigationProp>();
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);

  useEffect(() => {
    let fallbackTimeout: ReturnType<typeof setTimeout>;
    const markComplete = () => setIsTransitionComplete(true);

    const armFallback = () => {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = setTimeout(() => {
        if (navigation.isFocused()) {
          markComplete();
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
        markComplete();
      },
    );

    return () => {
      clearTimeout(fallbackTimeout);
      unsubscribeFocus();
      unsubscribeTransition();
    };
  }, [navigation]);

  return isTransitionComplete;
}

export default useScreenTransitionComplete;
