import { useLatestBalance } from '../../hooks/useLatestBalance';

export interface RecurringConfirmOrderSheetProps {
  isVisible: boolean;
  onClose: () => void;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}
