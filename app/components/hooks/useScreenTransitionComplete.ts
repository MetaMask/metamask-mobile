import { NavigationContext } from '@react-navigation/native';
import { createContext, useContext, useEffect, useState } from 'react';
import type { AppStackNavigationProp } from '../../core/NavigationService/types';

/**
 * Stand-in used when `NavigationContext` was not provided. A Jest mock of
 * `@react-navigation/native` that only stubs `useNavigation` leaves the
 * export `undefined`, and `useContext(undefined)` throws. The stand-in keeps
 * the `useContext` call unconditional so hook order stays the same.
 */
const MissingNavigationContext = createContext<
  AppStackNavigationProp | undefined
>(undefined);

/**
 * Delay, in ms, after which the screen is treated as settled when the navigator
 * never emits `transitionEnd` — the screen is the initial route, its animation
 * is disabled, it is not rendered inside a native stack, or there is no
 * navigator at all. Comfortably longer than the native push animation so it
 * only acts as a safety net.
 */
export const SCREEN_TRANSITION_FALLBACK_MS = 450;

/**
 * Tracks whether the screen's enter animation has finished, so callers can hold
 * back work that competes with it: showing the keyboard, or mounting an
 * expensive subtree. On iOS the keyboard paints its translucent background from
 * whatever sits behind it, so opening it mid-push makes it flash dark grey
 * before settling.
 *
 * Reads {@link NavigationContext} instead of `useNavigation`, because
 * `useNavigation` throws when the component is outside a navigator. When the
 * context export is missing, or its value is absent, the hook waits
 * {@link SCREEN_TRANSITION_FALLBACK_MS} and then reports complete. Inside a
 * navigator it keeps the previous behavior:
 * `transitionEnd` wins, `closing: true` is ignored, and a focused screen that
 * never emits the event still opens after the same fallback.
 *
 * `DeferredRender` composes this hook, then waits for one frame (and an idle
 * callback when the runtime provides one) before mounting deferred children.
 *
 * @returns `true` once the transition has ended or the fallback has elapsed.
 */
export function useScreenTransitionComplete(): boolean {
  // `transitionEnd` is a native-stack event. The context is typed as the base
  // navigation prop, which does not list that event. `??` is required at
  // runtime: a partial mock can make the import `undefined` even though the
  // type says it is always a context.
  const navigation = useContext(
    NavigationContext ?? MissingNavigationContext,
  ) as AppStackNavigationProp | undefined;
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);

  useEffect(() => {
    if (!navigation) {
      const fallbackTimeout = setTimeout(() => {
        setIsTransitionComplete(true);
      }, SCREEN_TRANSITION_FALLBACK_MS);

      return () => {
        clearTimeout(fallbackTimeout);
      };
    }

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
