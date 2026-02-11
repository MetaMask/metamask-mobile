import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

/**
 * Tells React Query when the app moves to foreground / background
 * so it can trigger refetches on focus, matching the browser behaviour
 * that React Query provides out of the box on web.
 */
export function useReactQueryFocusRefetch() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);
}
