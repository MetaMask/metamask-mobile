import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NotificationFeedbackType } from 'expo-haptics';
import { strings } from '../../../../../../locales/i18n';
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
import Engine from '../../../../../core/Engine';
import {
  usePerpsLivePositions,
  usePerpsCloseAllCalculations,
} from '../../hooks';
import usePerpsToasts, {
  type PerpsToastOptions,
} from '../../hooks/usePerpsToasts';
import PerpsCloseSummary from '../../components/PerpsCloseSummary';
import { createStyles } from './PerpsCloseAllPositionsView.styles';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';

const PerpsCloseAllPositionsView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { showToast } = usePerpsToasts();

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

  // Fetch positions from live stream
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000,
  });

  // Use hook for accurate fee and rewards calculations
  const calculations = usePerpsCloseAllCalculations({
    positions: positions || [],
    currentPrices: {}, // Could pass live prices here if available
  });

  // Track screen viewed event
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isInitialLoading],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.CLOSE_ALL_POSITIONS,
      [PerpsEventProperties.OPEN_POSITION]: positions?.length || 0,
    },
  });

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseAll = useCallback(async () => {
    const startTime = Date.now();
    setIsClosing(true);

    DevLogger.log('[PerpsCloseAllPositionsView] Starting close all positions', {
      positionCount: positions?.length || 0,
      totalMargin: calculations.totalMargin,
      totalPnl: calculations.totalPnl,
      estimatedTotalFees: calculations.totalFees,
      estimatedReceiveAmount: calculations.receiveAmount,
    });

    try {
      const result = await Engine.context.PerpsController.closePositions({
        closeAll: true,
      });

      const executionTime = Date.now() - startTime;

      if (result.success && result.successCount > 0) {
        DevLogger.log(
          '[PerpsCloseAllPositionsView] Close all positions succeeded',
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
        navigation.goBack();
      } else if (result.successCount > 0 && result.failureCount > 0) {
        DevLogger.log(
          '[PerpsCloseAllPositionsView] Close all positions partially succeeded',
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
        navigation.goBack();
      } else {
        DevLogger.log(
          '[PerpsCloseAllPositionsView] Close all positions failed',
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
      DevLogger.log('[PerpsCloseAllPositionsView] Close all positions error', {
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
  }, [showSuccessToast, showErrorToast, navigation, positions, calculations]);

  const handleKeepPositions = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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

  // Show loading state while fetching positions
  if (isInitialLoading) {
    return (
      <BottomSheet ref={sheetRef}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('perps.close_all_modal.title')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      </BottomSheet>
    );
  }

  // Show empty state if no positions
  if (!positions || positions.length === 0) {
    return (
      <BottomSheet ref={sheetRef}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('perps.close_all_modal.title')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.position.no_positions')}
          </Text>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
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

export default PerpsCloseAllPositionsView;
