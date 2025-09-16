import { useContext, useEffect, useMemo } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Engine from '../../../../core/Engine';

export const usePredictOrders = () => {
  const { toastRef } = useContext(ToastContext);
  const controller = Engine.context.PredictController;

  const selectActiveOrdersState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.activeOrders,
  );

  const selectOrdersToNotifyState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.ordersToNotify,
  );

  const activeOrdersState = useSelector(selectActiveOrdersState);

  const activeOrders = useMemo(
    () => Object.values(activeOrdersState),
    [activeOrdersState],
  );

  const ordersToNotify = useSelector(selectOrdersToNotifyState);

  useEffect(() => {
    const nextOrderNotification = ordersToNotify[0];
    if (!nextOrderNotification) {
      return;
    }

    const nextOrder = activeOrdersState[nextOrderNotification.orderId];

    if (!nextOrder) {
      return;
    }

    if (nextOrderNotification.status === 'filled') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        labelOptions: [{ label: 'Order completed' }],
        hasNoTimeout: false,
      });
    } else if (nextOrderNotification.status === 'error') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order failed' }],
        hasNoTimeout: false,
      });
    } else if (nextOrderNotification.status === 'pending') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order pending' }],
        hasNoTimeout: false,
      });
    } else {
      return;
    }

    controller.deleteOrderToNotify(nextOrderNotification.orderId);
  }, [activeOrdersState, controller, ordersToNotify, toastRef]);

  return { activeOrders };
};
