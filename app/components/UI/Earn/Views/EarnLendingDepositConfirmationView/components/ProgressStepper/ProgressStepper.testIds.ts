const prefix = 'progress-stepper';

export const PROGRESS_STEPPER_TEST_IDS = {
  STEP: `${prefix}-step`,
  STEP_ICON: {
    COMPLETED: `${prefix}-step-icon-completed`,
    LOADING: `${prefix}-step-icon-loading`,
    PENDING: `${prefix}-step-icon-pending`,
  },
  PROGRESS_BAR: `${prefix}-progress-bar`,
} as const;
