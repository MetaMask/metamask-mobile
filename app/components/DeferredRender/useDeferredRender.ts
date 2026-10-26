import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

import type { AppStackNavigationProp } from '../../core/NavigationService/types';
import { subscribeScreenTransition } from '../hooks/subscribeScreenTransition';

/** Options for {@link useDeferredRender}. */
export interface UseDeferredRenderOptions {
  /**
   * When `false`, return `true` immediately and do not schedule a frame.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Returns `true` one `requestAnimationFrame` after the screen's enter
 * transition has finished. The released value is the hook's only state, so a
 * gated subtree costs exactly one extra commit. Adds no timer of its own and
 * does not use `InteractionManager`.
 *
 * Once this hook has returned `true`, it keeps returning `true` for this
 * component's lifetime. `enabled` changing from `false` to `true` does not
 * drop back to `false` for a frame.
 *
 * @param options - `{ enabled: false }` renders on the first commit.
 * @returns Whether deferred content may render.
 */
export function useDeferredRender({
  enabled = true,
}: UseDeferredRenderOptions = {}): boolean {
  const navigation = useNavigation<AppStackNavigationProp>();
  const [isReleased, setIsReleased] = useState(() => !enabled);

  if (!enabled && !isReleased) {
    setIsReleased(true);
  }

  useEffect(() => {
    if (isReleased || !enabled) {
      return undefined;
    }

    let released = false;
    let frameId: number | undefined;

    const unsubscribe = subscribeScreenTransition(navigation, () => {
      if (released) {
        return;
      }
      released = true;
      frameId = requestAnimationFrame(() => {
        setIsReleased(true);
      });
    });

    return () => {
      unsubscribe();
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [enabled, isReleased, navigation]);

  return isReleased || !enabled;
}
