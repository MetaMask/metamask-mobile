import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  cancelHomepageReadyTrace,
  endHomepageReadyTrace,
  getActiveHomepageReadyTraceToken,
  startHomepageReadyTrace,
  type HomepageReadyContentState,
  type HomepageReadyTraceToken,
} from '../../../../core/Performance/HomepageReady';

interface UseHomepageReadyOptions {
  contentReady: boolean;
  contentState: HomepageReadyContentState;
}

const cancelTraceSeenWhileFocused = (
  focusedTraceTokenRef: RefObject<HomepageReadyTraceToken | null>,
) => {
  const traceToken = focusedTraceTokenRef.current;
  focusedTraceTokenRef.current = null;
  if (traceToken !== null) {
    cancelHomepageReadyTrace({ reason: 'navigated_away', traceToken });
  }
};

/**
 * Completes the Homepage Ready CUF when the focused homepage has usable token
 * content. It also measures warm app opens that return directly to Home.
 *
 * Leaving Home before the content is usable cancels the trace, so it never
 * includes time spent on other screens.
 */
export const useHomepageReady = ({
  contentReady,
  contentState,
}: UseHomepageReadyOptions) => {
  const isFocused = useIsFocused();
  const lastAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [foregroundSequence, setForegroundSequence] = useState(0);
  // Only the trace seen while focused is cancelled on blur. An unlock can
  // start its trace while Home sits under the lock screen, before a late blur
  // arrives.
  const focusedTraceTokenRef = useRef<HomepageReadyTraceToken | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

    focusedTraceTokenRef.current = getActiveHomepageReadyTraceToken();
    return () => cancelTraceSeenWhileFocused(focusedTraceTokenRef);
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && contentReady) {
      endHomepageReadyTrace({ contentState });
    }
  }, [contentReady, contentState, foregroundSequence, isFocused]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = lastAppStateRef.current;

      if (
        nextAppState === 'active' &&
        previousAppState === 'background' &&
        isFocused
      ) {
        const traceToken = startHomepageReadyTrace({
          source: 'app_open',
          appStartType: 'warm',
        });
        if (traceToken !== null) {
          focusedTraceTokenRef.current = traceToken;
        }
        // Force a post-foreground commit before ending an already-ready CUF.
        setForegroundSequence((sequence) => sequence + 1);
      }

      if (!(nextAppState === 'inactive' && previousAppState === 'background')) {
        lastAppStateRef.current = nextAppState;
      }
    });

    return () => subscription.remove();
  }, [isFocused]);
};
