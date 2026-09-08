import type { RecurringIntervalUnit } from '../../utils/recurringSchedule';

export const RecurringIntervalSheetSelectorsIDs = {
  SHEET: 'recurring-interval-sheet',
  CLOSE_BUTTON: 'recurring-interval-sheet-close',
  CONFIRM_BUTTON: 'recurring-interval-sheet-confirm',
  OPTION: (unit: RecurringIntervalUnit) => `recurring-interval-option-${unit}`,
} as const;
