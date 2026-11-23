import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';

/**
 * Route params for the recurring order confirmation modal.
 */
export interface RecurringConfirmOrderModalParams {
  /**
   * Entry point the user opened the swaps flow from, reported as the
   * `location` of the order's analytics events.
   */
  location: MetaMetricsSwapsEventSource;
}

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
