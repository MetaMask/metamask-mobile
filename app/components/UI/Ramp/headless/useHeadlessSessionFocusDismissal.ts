import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import { dismissHeadlessFlow } from './headlessEntryNavigation';
import { closeSession, getSession } from './sessionRegistry';

interface UseHeadlessSessionFocusDismissalOptions {
  disabled?: boolean;
}

/**
 * Closes a live headless session when HEADLESS_HOST is revealed again after
 * another native-flow screen was popped off the same stack.
 *
 * The host is intentionally kept at the stack base for post-auth resets. That
 * means backing out of EnterEmail, BasicInfo, KycWebview, etc. can refocus the
 * transparent host without unmounting it, so unmount-based cleanup never runs.
 */
export function useHeadlessSessionFocusDismissal(
  headlessSessionId: string | undefined,
  isFocused: boolean,
  options: UseHeadlessSessionFocusDismissalOptions = {},
): void {
  const navigation = useNavigation();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const latestIsFocusedRef = useRef(isFocused);
  latestIsFocusedRef.current = isFocused;

  const latestHeadlessSessionIdRef = useRef(headlessSessionId);
  latestHeadlessSessionIdRef.current = headlessSessionId;

  const blurredSessionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!headlessSessionId || options.disabled) {
      blurredSessionIdRef.current = undefined;
      return;
    }

    if (!isFocused) {
      blurredSessionIdRef.current = headlessSessionId;
      return;
    }

    if (blurredSessionIdRef.current !== headlessSessionId) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!latestIsFocusedRef.current) {
        return;
      }

      if (latestHeadlessSessionIdRef.current !== headlessSessionId) {
        return;
      }

      if (!getSession(headlessSessionId)) {
        return;
      }

      blurredSessionIdRef.current = undefined;
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
      dismissHeadlessFlow(navigationRef.current);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [headlessSessionId, isFocused, options.disabled]);
}

export default useHeadlessSessionFocusDismissal;
