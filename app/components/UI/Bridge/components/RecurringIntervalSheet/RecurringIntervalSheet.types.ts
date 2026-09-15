import type { RecurringIntervalUnit } from '../../utils/recurringSchedule';

export interface RecurringIntervalSheetProps {
  currentUnit: RecurringIntervalUnit;
  onConfirm: (unit: RecurringIntervalUnit) => void;
  goBack: () => void;
}
