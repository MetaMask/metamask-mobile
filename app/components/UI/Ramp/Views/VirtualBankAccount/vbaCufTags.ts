export const VBA_CUF_TAG = {
  FEATURE: 'feature',
  FLOW: 'flow',
  ENTRY_SURFACE: 'entry_surface',
  LIFECYCLE_CONTEXT: 'lifecycle_context',
  SUCCESS: 'success',
  REASON: 'reason',
  BACKGROUND_COUNT: 'background_count',
  RESUME_COUNT: 'resume_count',
} as const;

export const VBA_CUF_FEATURE = 'vba';
export const VBA_CUF_FLOW = 'vba';
export const VBA_CUF_FOREGROUND_ACTIVE_MS = 'foreground_active_ms';
export const VBA_CUF_LOG_MARKER = '[VbaCUF]';

export const VBA_CUF_ENTRY_SURFACE = {
  ADD_MONEY_SHEET: 'add_money_sheet',
  HOME_CARD: 'home_card',
  MONEY_ACTION_ROW: 'money_action_row',
} as const;

export type VbaCufEntrySurface =
  (typeof VBA_CUF_ENTRY_SURFACE)[keyof typeof VBA_CUF_ENTRY_SURFACE];

/** Entry surface for a Money entry `source` (home card, action row, sheet). */
export const getVbaCufEntrySurfaceForSource = (
  source: string,
): VbaCufEntrySurface => {
  if (source.startsWith('vba-home-card-')) {
    return VBA_CUF_ENTRY_SURFACE.HOME_CARD;
  }
  if (source === 'vba-action-row-details') {
    return VBA_CUF_ENTRY_SURFACE.MONEY_ACTION_ROW;
  }
  return VBA_CUF_ENTRY_SURFACE.ADD_MONEY_SHEET;
};

export const VBA_CUF_LIFECYCLE_CONTEXT = {
  COLD_PROCESS: 'cold_process',
  WARM: 'warm',
  BACKGROUND_RESUME: 'background_resume',
} as const;

export type VbaCufLifecycleContext =
  (typeof VBA_CUF_LIFECYCLE_CONTEXT)[keyof typeof VBA_CUF_LIFECYCLE_CONTEXT];

export const VBA_CUF_END_REASON = {
  AWAITING_PROVIDER: 'awaiting_provider',
  BAILED: 'bailed',
  ERROR: 'error',
  KYC_PENDING: 'kyc_pending',
  KYC_REJECTED: 'kyc_rejected',
  SUPERSEDED: 'superseded',
  TIMEOUT: 'timeout',
} as const;

export type VbaCufEndReason =
  (typeof VBA_CUF_END_REASON)[keyof typeof VBA_CUF_END_REASON];

export const VBA_CUF_TIMEOUT_MS = 30 * 60 * 1000;
export const VBA_CUF_TRACE_MAX_LIFETIME_MS = VBA_CUF_TIMEOUT_MS + 60 * 1000;
