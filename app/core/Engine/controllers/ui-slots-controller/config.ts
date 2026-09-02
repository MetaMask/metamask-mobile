export const UI_SLOTS_REMOTE_FLAG_NAME = 'uiSlots';

/**
 * Serves the bundled fixture instead of the published artifact, and force-enables
 * the controller so the remote flag is not required locally. Opt-in: the artifact
 * is published, so `__DEV__` alone must exercise the real transport.
 */
export const UI_SLOTS_LOCAL_MOCK_ENABLED =
  __DEV__ && process.env.MM_UI_SLOTS_MOCK === 'true';

export const UI_SLOTS_CONTRACT_MAJOR = 1;

export const UI_SLOTS_SOFT_TTL_MS = 15 * 60 * 1000;
export const UI_SLOTS_HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const UI_SLOTS_REQUEST_TIMEOUT_MS = 15 * 1000;

export const UI_SLOTS_MAX_CONFIGURATIONS = 20;
