import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  endHomepageReadyTrace,
  resolveColdHomepageReadyTrace,
  startHomepageReadyTrace,
  type HomepageReadyContentState,
} from '../../../../core/Performance/HomepageReady';

interface UseHomepageReadyOptions {
  contentReady: boolean;
  contentState: HomepageReadyContentState;
}

/**
 * Completes the Homepage Ready CUF when the focused homepage has usable token
 * content. It also measures warm app opens that return directly to Home.
 */
export const useHomepageReady = ({
  contentReady,
  contentState,
}: UseHomepageReadyOptions) => {
  const isFocused = useIsFocused();
  const lastAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [foregroundSequence, setForegroundSequence] = useState(0);
  const hasResolvedColdTraceRef = useRef(false);

  useEffect(() => {
    if (hasResolvedColdTraceRef.current) {
      return;
    }

    hasResolvedColdTraceRef.current = true;
    resolveColdHomepageReadyTrace({ isHomepageFocused: isFocused });
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
        startHomepageReadyTrace({
          source: 'app_open',
          appStartType: 'warm',
        });
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
