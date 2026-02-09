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
import { usePerpsLiveOrders, usePerpsCancelAllOrders } from '../../hooks';
import usePerpsToasts, {
  type PerpsToastOptions,
} from '../../hooks/usePerpsToasts';
import { createStyles } from './PerpsCancelAllOrdersView.styles';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../../constants/eventNames';
import type { CancelOrdersResult } from '../../controllers/types';

interface PerpsCancelAllOrdersViewProps {
  sheetRef?: React.RefObject<BottomSheetRef>;
  onClose?: () => void;
}

const PerpsCancelAllOrdersView: React.FC<PerpsCancelAllOrdersViewProps> = ({
  sheetRef: externalSheetRef,
  onClose: onExternalClose,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { showToast } = usePerpsToasts();

  // Fetch orders from live stream (excluding TP/SL orders)
  const { orders } = usePerpsLiveOrders({
    throttleMs: 1000,
    hideTpSl: true, // Exclude Take Profit and Stop Loss orders
  });

  // Track screen viewed event
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [true], // Always track when component mounts (WebSocket data loads instantly)
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.CANCEL_ALL_ORDERS,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: orders?.length || 0,
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
      } as PerpsToastOptions;
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
      } as PerpsToastOptions;
      showToast(toastConfig);
    },
    [showToast, theme.colors.accent01],
  );

  // Handle success callback from hook
  const handleSuccess = useCallback(
    (result: CancelOrdersResult) => {
      if (result.success && result.successCount > 0) {
        showSuccessToast(
          strings('perps.cancel_all_modal.success_title'),
          strings('perps.cancel_all_modal.success_message', {
            count: result.successCount,
          }),
        );
        // Close sheet after success when using external ref
        if (externalSheetRef && result.successCount > 0) {
          sheetRef.current?.onCloseBottomSheet(() => {
            onExternalClose?.();
          });
        }
      } else if (result.successCount > 0 && result.failureCount > 0) {
        showSuccessToast(
          strings('perps.cancel_all_modal.success_title'),
          strings('perps.cancel_all_modal.partial_success', {
            successCount: result.successCount,
            totalCount: result.successCount + result.failureCount,
          }),
        );
        // Close sheet after partial success when using external ref
        if (externalSheetRef && result.successCount > 0) {
          sheetRef.current?.onCloseBottomSheet(() => {
            onExternalClose?.();
          });
        }
      }
    },
    [showSuccessToast, externalSheetRef, sheetRef, onExternalClose],
  );

  // Handle error callback from hook
  const handleError = useCallback(
    (error: Error) => {
      showErrorToast(
        strings('perps.cancel_all_modal.error_title'),
        error.message || 'Unknown error',
      );
    },
    [showErrorToast],
  );

  // Use cancel all orders hook for business logic
  const { isCanceling, handleCancelAll, handleKeepOrders } =
    usePerpsCancelAllOrders(orders, {
      onSuccess: handleSuccess,
      onError: handleError,
      navigateBackOnSuccess: !externalSheetRef, // Don't navigate if using external ref
    });

  const handleClose = useCallback(() => {
    if (externalSheetRef) {
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, externalSheetRef, sheetRef, onExternalClose]);

  // Wrapper for "Keep Orders" button that properly handles overlay dismissal
  const handleKeepButtonPress = useCallback(() => {
    if (externalSheetRef) {
      // When used as overlay, close the sheet properly to remove overlay
      handleClose();
    } else {
      // When used as standalone screen, use hook's navigation
      handleKeepOrders();
    }
  }, [externalSheetRef, handleClose, handleKeepOrders]);

  const footerButtons = useMemo(
    () => [
      {
        label: strings('perps.cancel_all_modal.keep_orders'),
        onPress: handleKeepButtonPress,
        variant: ButtonVariants.Secondary,
        size: ButtonSize.Lg,
        disabled: isCanceling,
      },
      {
        label: isCanceling
          ? strings('perps.cancel_all_modal.canceling')
          : strings('perps.cancel_all_modal.confirm'),
        onPress: handleCancelAll,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        disabled: isCanceling,
        danger: true,
      },
    ],
    [handleKeepButtonPress, handleCancelAll, isCanceling],
  );

  // Show empty state if no orders (WebSocket data loads instantly, no loading state needed)
  if (!orders || orders.length === 0) {
    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={!externalSheetRef}
        onClose={externalSheetRef ? onExternalClose : undefined}
      >
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('perps.cancel_all_modal.title')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.order.no_orders')}
          </Text>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? onExternalClose : undefined}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.cancel_all_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.contentContainer}>
        {isCanceling ? (
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
              {strings('perps.cancel_all_modal.canceling')}
            </Text>
          </View>
        ) : (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.cancel_all_modal.description')}
          </Text>
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

export default PerpsCancelAllOrdersView;
