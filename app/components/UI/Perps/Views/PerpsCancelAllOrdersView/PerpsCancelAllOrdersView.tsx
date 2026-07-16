import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import { NotificationMoment } from '../../../../../util/haptics';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import { usePerpsLiveOrders, usePerpsCancelAllOrders } from '../../hooks';
import usePerpsToasts, {
  type PerpsToastOptions,
} from '../../hooks/usePerpsToasts';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type CancelOrdersResult,
} from '@metamask/perps-controller';

interface PerpsCancelAllOrdersViewProps {
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose?: () => void;
}

const PerpsCancelAllOrdersView: React.FC<PerpsCancelAllOrdersViewProps> = ({
  sheetRef: externalSheetRef,
  onClose: onExternalClose,
}) => {
  const theme = useTheme();
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
      [PERPS_EVENT_PROPERTY.SOURCE]:
        PERPS_EVENT_VALUE.SOURCE.CANCEL_ALL_ORDERS_BUTTON,
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
        hapticsType: NotificationMoment.Success,
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
        hapticsType: NotificationMoment.Error,
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

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.cancel_all_modal.keep_orders'),
      onPress: handleKeepButtonPress,
      size: ButtonSize.Lg,
      isDisabled: isCanceling,
    }),
    [handleKeepButtonPress, isCanceling],
  );

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.cancel_all_modal.confirm'),
      onPress: handleCancelAll,
      size: ButtonSize.Lg,
      isDanger: true,
      isLoading: isCanceling,
      isDisabled: isCanceling,
    }),
    [handleCancelAll, isCanceling],
  );

  // Show empty state if no orders (WebSocket data loads instantly, no loading state needed)
  if (!orders || orders.length === 0) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={!externalSheetRef ? () => navigation.goBack() : undefined}
        onClose={externalSheetRef ? onExternalClose : undefined}
      >
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{ testID: 'header-close' }}
        >
          {strings('perps.cancel_all_modal.title')}
        </BottomSheetHeader>
        <Box paddingHorizontal={4}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.order.no_orders')}
          </Text>
        </Box>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={!externalSheetRef ? () => navigation.goBack() : undefined}
      onClose={externalSheetRef ? onExternalClose : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'header-close' }}
      >
        {strings('perps.cancel_all_modal.title')}
      </BottomSheetHeader>

      <Box paddingHorizontal={4}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.cancel_all_modal.description')}
        </Text>
      </Box>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={secondaryButtonProps}
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default PerpsCancelAllOrdersView;
