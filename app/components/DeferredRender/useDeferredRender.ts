import { useNavigation } from '@react-navigation/native';
import { useContext, useEffect, useRef, useState } from 'react';

import type { AppStackNavigationProp } from '../../core/NavigationService/types';
import { subscribeScreenTransition } from '../hooks/subscribeScreenTransition';
import { DeferredRenderContext } from './DeferredRenderContext';

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
  const isNested = useContext(DeferredRenderContext);
  const warnedRef = useRef(false);

  if (!enabled && !isReleased) {
    setIsReleased(true);
  }

  useEffect(() => {
    if (!__DEV__ || !isNested || warnedRef.current) {
      return;
    }

    warnedRef.current = true;
    console.warn(
      'DeferredRender: a gate is already deferring this subtree. Use one gate per screen; a nested gate mounts after the outer release, misses transitionEnd and waits for the 450 ms fallback.',
    );
  }, [isNested]);

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
