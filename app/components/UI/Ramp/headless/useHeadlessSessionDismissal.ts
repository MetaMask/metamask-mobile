import { useEffect } from 'react';

import { closeSession, getSession } from './sessionRegistry';

/**
 * Fires `onClose({ reason: 'user_dismissed' })` for a headless session when
 * the host screen unmounts without the session having terminated through
 * any other path.
 *
 * Termination paths that run before unmount remove the session from the
 * registry, so the cleanup re-reads `getSession(id)` and no-ops:
 *
 * - Phase 6 success — `closeSession({ reason: 'completed' })`
 * - Phase 7 errors — `failSession` → `closeSession({ reason: 'unknown' })`
 * - Phase 5 single-live-session restart — `closeSession({ reason: 'consumer_cancelled' })`
 * - Consumer `cancel()` — same
 * - `handleBack` (this PR) — fires `closeSession({ reason: 'user_dismissed' })` synchronously before `goBack`, so the cleanup that follows the unmount is also a no-op.
 *
 * Wire this into the screen that acts as the stack base for the headless
 * flow (today: `HeadlessHost`). React Navigation keeps that screen mounted
 * while child screens are pushed on top, so the cleanup only runs when the
 * user has actually unwound the entire headless stack.
 */
export function useHeadlessSessionDismissal(
  headlessSessionId: string | undefined,
): void {
  useEffect(
    () => () => {
      if (!getSession(headlessSessionId)) {
        return;
      }
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
    },
    [headlessSessionId],
  );
}

export default useHeadlessSessionDismissal;
