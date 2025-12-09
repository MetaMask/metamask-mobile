import React, { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { useRewardsAccountOptedIn } from '../../../../UI/Perps/hooks/useRewardsAccountOptedIn';
import { limitToMaximumDecimalPlaces } from '../../../../../util/number';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import RewardsTooltipBottomSheet from '../../../../UI/Earn/components/RewardsTooltipBottomSheet';

export interface UseCustomAmountRewardsParams {
  /**
   * The human-readable amount (e.g., "100.50")
   * Used to calculate estimated rewards points and output amount display
   */
  amountHuman: string;
}

export interface UseCustomAmountRewardsResult {
  /** Whether to show the rewards tag */
  shouldShowRewardsTag: boolean;
  /** Estimated points (null when not applicable) */
  estimatedPoints: number | null;
  /** Callback for rewards tag press */
  onRewardsTagPress: () => void;
  /** Whether to show an output amount tag instead of PayTokenAmount */
  shouldShowOutputAmountTag: boolean;
  /** Output amount for the tag (formatted, null when not applicable) */
  outputAmount: string | null;
  /** Symbol for the output amount (null when not applicable) */
  outputSymbol: string | null;
  /** Render function for the rewards tooltip bottom sheet */
  renderRewardsTooltip: () => React.ReactNode;
}

/**
 * Hook for managing rewards-related logic in custom amount flows.
 * Encapsulates transaction type detection, points calculation, and tooltip state.
 *
 * Currently supports mUSD conversion with hardcoded points calculation.
 * When mUSD moves to API-based estimation, only this hook implementation
 * changes - consuming components remain untouched.
 *
 * @param params - Hook parameters including the amount for points calculation
 * @returns Rewards state and callbacks for UI integration
 */
export const useCustomAmountRewards = ({
  amountHuman,
}: UseCustomAmountRewardsParams): UseCustomAmountRewardsResult => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  const transactionMeta = useTransactionMetadataRequest();
  const isMusdConversion =
    isMusdConversionFlowEnabled &&
    hasTransactionType(transactionMeta, [TransactionType.musdConversion]);

  const { accountOptedIn } = useRewardsAccountOptedIn({
    requireActiveSeason: true,
  });
  const isOptedIn = accountOptedIn ?? false;

  // Calculate rewards points: 5 points per $100 USD
  // This is a temporary hardcoded calculation for mUSD deposits.
  // Will be replaced with API-based estimation when available.
  const estimatedPoints = useMemo(() => {
    if (!isMusdConversion) {
      return null;
    }
    const amount = parseFloat(amountHuman) || 0;
    return Math.floor(amount / 100) * 5;
  }, [isMusdConversion, amountHuman]);

  const shouldShowRewardsTag = isMusdConversion;

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

  const onRewardsTagPress = useCallback(() => {
    setIsTooltipVisible(true);
  }, []);

  const onTooltipClose = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);

  const renderRewardsTooltip = useCallback((): React.ReactNode => {
    if (!isTooltipVisible) {
      return null;
    }

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <RewardsTooltipBottomSheet
            isOptedIn={isOptedIn}
            isVisible={isTooltipVisible}
            onClose={onTooltipClose}
          />
        </Modal>
      </View>
    );
  }, [isTooltipVisible, isOptedIn, onTooltipClose]);

  return {
    shouldShowRewardsTag,
    estimatedPoints,
    onRewardsTagPress,
    shouldShowOutputAmountTag,
    outputAmount,
    outputSymbol,
    renderRewardsTooltip,
  };
};
