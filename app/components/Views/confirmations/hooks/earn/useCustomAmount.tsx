import { TransactionType } from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { limitToMaximumDecimalPlaces } from '../../../../../util/number';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';

export interface UseCustomAmountParams {
  /**
   * The human-readable amount (e.g., "100.50")
   * Used to calculate output amount display
   */
  amountHuman: string;
}

export interface UseCustomAmountResult {
  /** Whether to show an output amount tag instead of PayTokenAmount */
  shouldShowOutputAmountTag: boolean;
  /** Output amount for the tag (formatted, null when not applicable) */
  outputAmount: string | null;
  /** Symbol for the output amount (null when not applicable) */
  outputSymbol: string | null;
}

/**
 * Hook for managing custom amount logic in custom amount flows.
 * Encapsulates transaction type detection, points calculation, and tooltip state.
 *
 * @param params - Hook parameters including the amount for points calculation
 * @returns Custom amount state and callbacks for UI integration
 */
export const useCustomAmount = ({
  amountHuman,
}: UseCustomAmountParams): UseCustomAmountResult => {
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const transactionMeta = useTransactionMetadataRequest();
  const isMusdConversion =
    isMusdConversionFlowEnabled &&
    isGeoEligible &&
    hasTransactionType(transactionMeta, [TransactionType.musdConversion]);

  // Output amount tag logic - currently for mUSD conversion only
  const shouldShowOutputAmountTag = isMusdConversion;

  const outputAmount = useMemo(() => {
    if (!shouldShowOutputAmountTag) {
      return null;
    }
    return limitToMaximumDecimalPlaces(parseFloat(amountHuman) || 0, 2);
  }, [shouldShowOutputAmountTag, amountHuman]);

  const outputSymbol = useMemo(() => {
    if (!shouldShowOutputAmountTag) {
      return null;
    }
    // For mUSD conversion, the output symbol is always mUSD
    return 'mUSD';
  }, [shouldShowOutputAmountTag]);

  return {
    shouldShowOutputAmountTag,
    outputAmount,
    outputSymbol,
  };
};
