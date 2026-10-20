import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import { SCREEN_TRANSITION_FALLBACK_MS } from '../../../hooks/useScreenTransitionComplete';

/**
 * Keeps a native-stack screen's heavy subtree unmounted until the push
 * animation finishes, then reveals it on the next frame.
 *
 * Bottom tabs never emit `transitionEnd`. Pass `isStackPush` false for that
 * route so the screen starts ready and does not flash a placeholder.
 *
 * A push that never emits `transitionEnd` (animation disabled, or a test
 * renderer without the event) reveals after {@link SCREEN_TRANSITION_FALLBACK_MS}
 * so the placeholder cannot stick. A navigator with no `addListener` (unit
 * tests) reveals on the first layout effect.
 */
export function useDeferHeavyContentUntilTransition(
  isStackPush: boolean,
): boolean {
  const navigation = useNavigation<AppStackNavigationProp>();
  const [ready, setReady] = useState(!isStackPush);

  useLayoutEffect(() => {
    if (!isStackPush || ready) {
      return;
    }
    if (typeof navigation.addListener !== 'function') {
      setReady(true);
    }
  }, [isStackPush, navigation, ready]);

  useEffect(() => {
    if (!isStackPush || ready) {
      return undefined;
    }
    if (typeof navigation.addListener !== 'function') {
      return undefined;
    }

    let frame = 0;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      if (fallback !== undefined) {
        clearTimeout(fallback);
        fallback = undefined;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setReady(true);
      });
    };

    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (event.data.closing) {
        return;
      }
      reveal();
    });
    fallback = setTimeout(reveal, SCREEN_TRANSITION_FALLBACK_MS);

    return () => {
      unsubscribe();
      if (fallback !== undefined) {
        clearTimeout(fallback);
      }
      cancelAnimationFrame(frame);
    };
  }, [isStackPush, navigation, ready]);

  return ready;
}
