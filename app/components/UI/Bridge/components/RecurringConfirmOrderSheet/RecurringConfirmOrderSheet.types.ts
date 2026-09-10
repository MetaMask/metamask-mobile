import { useLatestBalance } from '../../hooks/useLatestBalance';
import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';

export interface RecurringConfirmOrderSheetProps {
  delegationFee: EIP7702UpgradeFee;
  isSubmitting: boolean;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  onConfirm: () => void;
  onEditSlippagePress: () => void;
  onDelegationFeeInfoPress: () => void;
  goBack: () => void;
}
