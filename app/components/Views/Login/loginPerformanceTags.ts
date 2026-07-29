/**
 * Login span tags for Sentry (TO-981).
 *
 * `app_start_type` is process-scoped: Login mounts before the first unlock
 * interaction completes are `cold`; mounts after that are `warm` (e.g. lock
 * then unlock again in the same process).
 */

export const LOGIN_APP_START_TYPE = {
  COLD: 'cold',
  WARM: 'warm',
} as const;

export type LoginAppStartType =
  (typeof LOGIN_APP_START_TYPE)[keyof typeof LOGIN_APP_START_TYPE];

export const LOGIN_CONTENT_STATE = {
  FILLED: 'filled',
  EMPTY: 'empty',
} as const;

export type LoginContentState =
  (typeof LOGIN_CONTENT_STATE)[keyof typeof LOGIN_CONTENT_STATE];

let hasCompletedLoginInteractionInProcess = false;

/**
 * Returns cold until the first login interaction ends in this process, then warm.
 * Exported for unit tests.
 */
export function getLoginAppStartType(): LoginAppStartType {
  return hasCompletedLoginInteractionInProcess
    ? LOGIN_APP_START_TYPE.WARM
    : LOGIN_APP_START_TYPE.COLD;
}

/**
 * Marks that a login interaction has completed so later mounts read as warm.
 * Exported for unit tests.
 */
export function markLoginInteractionCompleted(): void {
  hasCompletedLoginInteractionInProcess = true;
}

/** Reset process-scoped start-type tracking. Exported for unit tests. */
export function resetLoginAppStartTypeForTesting(): void {
  hasCompletedLoginInteractionInProcess = false;
}

export interface LoginPerformanceTags {
  locked: boolean;
  app_start_type: LoginAppStartType;
}

export function getLoginPerformanceTags(locked: boolean): LoginPerformanceTags {
  return {
    locked,
    app_start_type: getLoginAppStartType(),
  };
}

export function getLoginInteractionEndData(
  contentState: LoginContentState = LOGIN_CONTENT_STATE.FILLED,
): { success: true; content_state: LoginContentState } {
  return {
    success: true,
    content_state: contentState,
  };
}
