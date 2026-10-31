import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import type { AppStackNavigationProp } from '../../core/NavigationService/types';
import { subscribeScreenTransition } from './subscribeScreenTransition';

export { SCREEN_TRANSITION_FALLBACK_MS } from './subscribeScreenTransition';

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

  useEffect(
    () =>
      subscribeScreenTransition(navigation, () =>
        setIsTransitionComplete(true),
      ),
    [navigation],
  );

  return isTransitionComplete;
}

export default useScreenTransitionComplete;
