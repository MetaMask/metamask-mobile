import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';

export interface RecurringConfirmOrderSheetProps {
  currentCurrency: string;
  delegationFee: EIP7702UpgradeFee;
  fiatToUsdRate?: number;
  isPriceRangeConversionReady: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onEditSlippagePress: () => void;
  onDelegationFeeInfoPress: () => void;
  goBack: () => void;
}
