import { useLatestBalance } from '../../hooks/useLatestBalance';

export interface RecurringConfirmOrderSheetProps {
  isSubmitting: boolean;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  onConfirm: () => void;
  onEditSlippagePress: () => void;
  goBack: () => void;
}
