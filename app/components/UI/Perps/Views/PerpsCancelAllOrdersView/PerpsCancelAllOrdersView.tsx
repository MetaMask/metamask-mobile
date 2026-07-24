import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, { useCallback, useMemo, useRef } from 'react';
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
import { usePerpsLiveOrders, usePerpsCancelAllOrders } from '../../hooks';
import usePerpsToasts from '../../hooks/usePerpsToasts';
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
  const navigation = useNavigation<AppNavigationProp>();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const { orders } = usePerpsLiveOrders({
    throttleMs: 1000,
    hideTpSl: true,
  });

  const hasOrders = Boolean(orders?.length);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [true],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.CANCEL_ALL_ORDERS,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: orders?.length || 0,
      [PERPS_EVENT_PROPERTY.SOURCE]:
        PERPS_EVENT_VALUE.SOURCE.CANCEL_ALL_ORDERS_BUTTON,
    },
  });

  const closeSheetIfOverlay = useCallback(() => {
    if (!externalSheetRef) {
      return;
    }
    sheetRef.current?.onCloseBottomSheet(() => {
      onExternalClose?.();
    });
  }, [externalSheetRef, sheetRef, onExternalClose]);

  const handleSuccess = useCallback(
    (result: CancelOrdersResult) => {
      if (result.successCount <= 0) {
        return;
      }

      const { shared } = PerpsToastOptions.orderManagement;

      if (result.success) {
        showToast(shared.cancelAllSuccess(result.successCount));
        closeSheetIfOverlay();
        return;
      }

      if (result.failureCount > 0) {
        showToast(
          shared.cancelAllPartialSuccess(
            result.successCount,
            result.successCount + result.failureCount,
          ),
        );
        closeSheetIfOverlay();
      }
    },
    [showToast, PerpsToastOptions, closeSheetIfOverlay],
  );

  const handleError = useCallback(
    (error: Error) => {
      showToast(
        PerpsToastOptions.orderManagement.shared.cancelAllFailed(
          error.message || 'Unknown error',
        ),
      );
    },
    [showToast, PerpsToastOptions],
  );

  const { isCanceling, handleCancelAll, handleKeepOrders } =
    usePerpsCancelAllOrders(orders, {
      onSuccess: handleSuccess,
      onError: handleError,
      navigateBackOnSuccess: !externalSheetRef,
    });

  const handleClose = useCallback(() => {
    if (externalSheetRef) {
      closeSheetIfOverlay();
    } else {
      navigation.goBack();
    }
  }, [navigation, externalSheetRef, closeSheetIfOverlay]);

  const handleKeepButtonPress = useCallback(() => {
    if (externalSheetRef) {
      handleClose();
    } else {
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
          {hasOrders
            ? strings('perps.cancel_all_modal.description')
            : strings('perps.order.no_orders')}
        </Text>
      </Box>

      {hasOrders ? (
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          secondaryButtonProps={secondaryButtonProps}
          primaryButtonProps={primaryButtonProps}
          twClassName="pt-6"
        />
      ) : null}
    </BottomSheet>
  );
};

export default PerpsCancelAllOrdersView;
