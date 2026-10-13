import type { RecurringIntervalUnit } from '../../utils/recurringSchedule';

export interface RecurringIntervalSheetProps {
  currentUnit: RecurringIntervalUnit;
  onSelect: (unit: RecurringIntervalUnit) => void;
  goBack: () => void;
}
