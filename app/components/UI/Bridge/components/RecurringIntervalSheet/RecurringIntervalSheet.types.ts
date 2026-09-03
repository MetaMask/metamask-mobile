import type { RecurringIntervalUnit } from '../../utils/recurringSchedule';

export interface RecurringIntervalSheetProps {
  isVisible: boolean;
  currentUnit: RecurringIntervalUnit;
  onClose: () => void;
  onConfirm: (unit: RecurringIntervalUnit) => void;
}
