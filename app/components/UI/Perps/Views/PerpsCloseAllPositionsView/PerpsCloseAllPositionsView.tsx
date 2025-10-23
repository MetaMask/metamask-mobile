import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
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
import {
  usePerpsLivePositions,
  usePerpsCloseAllCalculations,
  usePerpsCloseAllPositions,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
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
import type { ClosePositionsResult } from '../../controllers/types';

const PerpsCloseAllPositionsView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { showToast } = usePerpsToasts();

  // Fetch positions from live stream
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000,
  });

  // Fetch current prices for fee calculations (throttled to avoid excessive updates)
  const symbols = useMemo(
    () => (positions || []).map((pos) => pos.coin),
    [positions],
  );
  const priceData = usePerpsLivePrices({
    symbols,
    throttleMs: 1000,
  });

  // Use hook for accurate fee and rewards calculations
  const calculations = usePerpsCloseAllCalculations({
    positions: positions || [],
    priceData,
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

  // Toast helper for success
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

  // Toast helper for errors
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

  // Handle success callback from hook
  const handleSuccess = useCallback(
    (result: ClosePositionsResult) => {
      if (result.success && result.successCount > 0) {
        showSuccessToast(
          strings('perps.close_all_modal.success_title'),
          strings('perps.close_all_modal.success_message', {
            count: result.successCount,
          }),
        );
      } else if (result.successCount > 0 && result.failureCount > 0) {
        showSuccessToast(
          strings('perps.close_all_modal.success_title'),
          strings('perps.close_all_modal.partial_success', {
            successCount: result.successCount,
            totalCount: result.successCount + result.failureCount,
          }),
        );
      }
    },
    [showSuccessToast],
  );

  // Handle error callback from hook
  const handleError = useCallback(
    (error: Error) => {
      showErrorToast(
        strings('perps.close_all_modal.error_title'),
        error.message || 'Unknown error',
      );
    },
    [showErrorToast],
  );

  // Use close all positions hook for business logic
  const { isClosing, handleCloseAll, handleKeepPositions } =
    usePerpsCloseAllPositions(positions, {
      onSuccess: handleSuccess,
      onError: handleError,
      calculations: {
        totalMargin: String(calculations.totalMargin),
        totalPnl: String(calculations.totalPnl),
        totalFees: String(calculations.totalFees),
        receiveAmount: String(calculations.receiveAmount),
      },
    });

  const handleClose = useCallback(() => {
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
