import React, { useCallback, useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NotificationFeedbackType } from 'expo-haptics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import createStyles from './PerpsCloseAllPositionsModal.styles';
import usePerpsToasts, {
  type PerpsToastOptions,
} from '../../hooks/usePerpsToasts';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../../controllers/types';
import { usePerpsCloseAllCalculations } from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import PerpsCloseSummary from '../PerpsCloseSummary';

interface PerpsCloseAllPositionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  positions: Position[];
  onSuccess?: () => void;
}

const PerpsCloseAllPositionsModal: React.FC<
  PerpsCloseAllPositionsModalProps
> = ({ isVisible, onClose, positions, onSuccess }) => {
  const { styles, theme } = useStyles(createStyles, {});
  const bottomSheetRef = React.useRef<BottomSheetRef>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { showToast } = usePerpsToasts();

  // Fetch current prices for fee calculations (throttled to avoid excessive updates)
  const symbols = useMemo(() => positions.map((pos) => pos.coin), [positions]);
  const priceData = usePerpsLivePrices({
    symbols,
    throttleMs: 1000,
  });

  const showSuccessToast = useCallback(
    (title: string, message?: string) => {
      const toastConfig: PerpsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        backgroundColor: theme.colors.accent03.normal,
        iconColor: theme.colors.accent03.dark,
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
        labelOptions: message
          ? [
              { label: title, isBold: true },
              { label: '\n', isBold: false },
              { label: message, isBold: false },
            ]
          : [{ label: title, isBold: true }],
      };
      showToast(toastConfig);
    },
    [showToast, theme.colors.accent03],
  );

  const showErrorToast = useCallback(
    (title: string, message?: string) => {
      const toastConfig: PerpsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        backgroundColor: theme.colors.accent01.light,
        iconColor: theme.colors.accent01.dark,
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
        labelOptions: message
          ? [
              { label: title, isBold: true },
              { label: '\n', isBold: false },
              { label: message, isBold: false },
            ]
          : [{ label: title, isBold: true }],
      };
      showToast(toastConfig);
    },
    [showToast, theme.colors.accent01],
  );

  // Use the fixed hook for accurate fee and rewards calculations
  const calculations = usePerpsCloseAllCalculations({
    positions,
    priceData,
  });

  const handleCloseAll = useCallback(async () => {
    const startTime = Date.now();
    setIsClosing(true);

    DevLogger.log(
      '[PerpsCloseAllPositionsModal] Starting close all positions',
      {
        positionCount: positions.length,
        totalMargin: calculations.totalMargin,
        totalPnl: calculations.totalPnl,
        estimatedTotalFees: calculations.totalFees,
        estimatedReceiveAmount: calculations.receiveAmount,
      },
    );

    try {
      const result = await Engine.context.PerpsController.closePositions({
        closeAll: true,
      });

      const executionTime = Date.now() - startTime;

      if (result.success && result.successCount > 0) {
        DevLogger.log(
          '[PerpsCloseAllPositionsModal] Close all positions succeeded',
          {
            successCount: result.successCount,
            failureCount: result.failureCount,
            executionTimeMs: executionTime,
          },
        );

        showSuccessToast(
          strings('perps.close_all_modal.success_title'),
          strings('perps.close_all_modal.success_message', {
            count: result.successCount,
          }),
        );
        onSuccess?.();
        bottomSheetRef.current?.onCloseBottomSheet();
      } else if (result.successCount > 0 && result.failureCount > 0) {
        DevLogger.log(
          '[PerpsCloseAllPositionsModal] Close all positions partially succeeded',
          {
            successCount: result.successCount,
            failureCount: result.failureCount,
            totalCount: result.successCount + result.failureCount,
            executionTimeMs: executionTime,
          },
        );

        showSuccessToast(
          strings('perps.close_all_modal.success_title'),
          strings('perps.close_all_modal.partial_success', {
            successCount: result.successCount,
            totalCount: result.successCount + result.failureCount,
          }),
        );
        onSuccess?.();
        bottomSheetRef.current?.onCloseBottomSheet();
      } else {
        DevLogger.log(
          '[PerpsCloseAllPositionsModal] Close all positions failed',
          {
            failureCount: result.failureCount,
            executionTimeMs: executionTime,
          },
        );

        showErrorToast(
          strings('perps.close_all_modal.error_title'),
          strings('perps.close_all_modal.error_message', {
            count: result.failureCount,
          }),
        );
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      DevLogger.log('[PerpsCloseAllPositionsModal] Close all positions error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        executionTimeMs: executionTime,
      });

      showErrorToast(
        strings('perps.close_all_modal.error_title'),
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsClosing(false);
    }
  }, [
    showSuccessToast,
    showErrorToast,
    onSuccess,
    positions.length,
    calculations,
  ]);

  const handleKeepPositions = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const footerButtons = useMemo(
    () => [
      {
        label: strings('perps.close_all_modal.keep_positions'),
        onPress: handleKeepPositions,
        variant: ButtonVariants.Secondary,
        size: ButtonSize.Lg,
        disabled: isClosing,
      },
      {
        label: isClosing
          ? strings('perps.close_all_modal.closing')
          : strings('perps.close_all_modal.close_all'),
        onPress: handleCloseAll,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        disabled: isClosing,
        danger: true,
      },
    ],
    [handleKeepPositions, handleCloseAll, isClosing],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.close_all_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.contentContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('perps.close_all_modal.description')}
        </Text>

        {isClosing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.loadingText}
            >
              {strings('perps.close_all_modal.closing')}
            </Text>
          </View>
        ) : (
          <PerpsCloseSummary
            totalMargin={calculations.totalMargin}
            totalPnl={calculations.totalPnl}
            totalFees={calculations.totalFees}
            feeDiscountPercentage={calculations.avgFeeDiscountPercentage}
            metamaskFeeRate={calculations.avgMetamaskFeeRate}
            protocolFeeRate={calculations.avgProtocolFeeRate}
            originalMetamaskFeeRate={calculations.avgOriginalMetamaskFeeRate}
            receiveAmount={calculations.receiveAmount}
            shouldShowRewards={calculations.shouldShowRewards}
            estimatedPoints={calculations.totalEstimatedPoints}
            bonusBips={calculations.avgBonusBips}
            isLoadingRewards={calculations.isLoading}
            hasRewardsError={calculations.hasError}
          />
        )}
      </View>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsCloseAllPositionsModal;
