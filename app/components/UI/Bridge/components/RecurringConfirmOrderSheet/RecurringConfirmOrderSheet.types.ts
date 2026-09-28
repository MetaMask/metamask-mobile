import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';

export interface RecurringConfirmOrderSheetProps {
  delegationFee: EIP7702UpgradeFee;
  isSubmitting: boolean;
  onConfirm: () => void;
  onEditSlippagePress: () => void;
  onDelegationFeeInfoPress: () => void;
  goBack: () => void;
}
