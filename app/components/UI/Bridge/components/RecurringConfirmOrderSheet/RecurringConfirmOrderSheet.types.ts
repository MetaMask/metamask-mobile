import { useLatestBalance } from '../../hooks/useLatestBalance';

export interface RecurringConfirmOrderSheetProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  onEditSlippagePress: () => void;
  goBack: () => void;
}
