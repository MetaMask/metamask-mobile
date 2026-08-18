export const UI_SLOTS_REMOTE_FLAG_NAME = 'uiSlots';
export const UI_SLOTS_LOCAL_MOCK_ENABLED =
  __DEV__ && process.env.MM_UI_SLOTS_ENABLED !== 'false';

export const UI_SLOTS_PLATFORM = 'mobile';
export const UI_SLOTS_CONTRACT_MAJOR = 1;
// Bump whenever slot, widget, action, or data-reference capabilities change.
export const UI_SLOTS_CAPABILITY_COHORT = 'mobile-v2';

export const UI_SLOTS_SOFT_TTL_MS = 15 * 60 * 1000;
export const UI_SLOTS_HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const UI_SLOTS_MAX_CONFIGURATIONS = 20;
export const UI_SLOTS_MAX_DISMISSALS = 500;
