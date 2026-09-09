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
  type Order,
} from '@metamask/perps-controller';
import { PerpsCancelAllOrdersViewSelectorsIDs } from '../../Perps.testIds';
import {
  resolveCancelAllErrorMessage,
  resolveCancelAllSuccessFeedback,
} from './resolveCancelAllOrdersFeedback';

interface PerpsCancelAllOrdersViewProps {
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose?: () => void;
  /** When provided, only these orders are described and cancelled. */
  orders?: Order[];
  /** Scopes cancellation to `orders` instead of the whole book. */
  isFiltered?: boolean;
}

const PerpsCancelAllOrdersView: React.FC<PerpsCancelAllOrdersViewProps> = ({
  sheetRef: externalSheetRef,
  onClose: onExternalClose,
  orders: propOrders,
  isFiltered = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // The live stream is the fallback for call sites that do not scope the sheet
  // themselves (the Lite home screen); a Pro panel passes its filtered list in.
  const { orders: liveOrders } = usePerpsLiveOrders({
    throttleMs: 1000,
    hideTpSl: true,
  });
  const orders = propOrders ?? liveOrders;

  const orderCount = orders?.length ?? 0;
  const hasOrders = orderCount > 0;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [true],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.CANCEL_ALL_ORDERS,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: orderCount,
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
      const feedback = resolveCancelAllSuccessFeedback(result);
      const { shared } = PerpsToastOptions.orderManagement;

      if (feedback.action === 'success') {
        showToast(shared.cancelAllSuccess(feedback.successCount));
        if (feedback.shouldCloseOverlay) {
          closeSheetIfOverlay();
        }
        return;
      }

      if (feedback.action === 'partial') {
        showToast(
          shared.cancelAllPartialSuccess(
            feedback.successCount,
            feedback.totalCount,
          ),
        );
        if (feedback.shouldCloseOverlay) {
          closeSheetIfOverlay();
        }
      }
    },
    [showToast, PerpsToastOptions, closeSheetIfOverlay],
  );

  const handleError = useCallback(
    (error: Error) => {
      showToast(
        PerpsToastOptions.orderManagement.shared.cancelAllFailed(
          resolveCancelAllErrorMessage(error),
        ),
      );
    },
    [showToast, PerpsToastOptions],
  );

  // A caller-supplied list is the exact set the sheet counted for the user, and
  // it may hold orders the provider-side `cancelAll` refuses to touch (TP/SL
  // triggers). Scope by orderId whenever we were given one, so confirming
  // cancels what was listed instead of silently matching nothing.
  const { isCanceling, handleCancelAll, handleKeepOrders } =
    usePerpsCancelAllOrders(orders, {
      onSuccess: handleSuccess,
      onError: handleError,
      navigateBackOnSuccess: !externalSheetRef,
      isFiltered: isFiltered || Boolean(propOrders),
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
      testID: PerpsCancelAllOrdersViewSelectorsIDs.KEEP_BUTTON,
    }),
    [handleKeepButtonPress, isCanceling],
  );

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.cancel_all_modal.confirm'),
      onPress: handleCancelAll,
      size: ButtonSize.Lg,
      isLoading: isCanceling,
      isDisabled: isCanceling,
      testID: PerpsCancelAllOrdersViewSelectorsIDs.CANCEL_ALL_BUTTON,
    }),
    [handleCancelAll, isCanceling],
  );

  // One title and one count-based body in both states: the count already names
  // the scope, so the copy does not branch on the filter.
  const title = strings('perps.cancel_all_modal.title');
  const description = strings('perps.cancel_all_modal.description', {
    count: orderCount,
  });

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={!externalSheetRef ? () => navigation.goBack() : undefined}
      onClose={externalSheetRef ? onExternalClose : undefined}
      testID={PerpsCancelAllOrdersViewSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'header-close' }}
        testID={PerpsCancelAllOrdersViewSelectorsIDs.TITLE}
      >
        {title}
      </BottomSheetHeader>

      <Box paddingHorizontal={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PerpsCancelAllOrdersViewSelectorsIDs.DESCRIPTION}
        >
          {hasOrders ? description : strings('perps.order.no_orders')}
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
