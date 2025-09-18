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

export const usePredictNotifications = () => {
  const { toastRef } = useContext(ToastContext);
  const controller = Engine.context.PredictController;

  const selectActiveOrdersState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.activeOrders,
  );

  const selectNotifications = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.notifications,
  );

  const activeOrdersState = useSelector(selectActiveOrdersState);

  const activeOrders = useMemo(
    () => Object.values(activeOrdersState),
    [activeOrdersState],
  );

  const notifications = useSelector(selectNotifications);

  useEffect(() => {
    const nextNotification = notifications[0];
    if (!nextNotification) {
      return;
    }

    const nextOrder = activeOrdersState[nextNotification.orderId];

    if (!nextOrder) {
      return;
    }

    if (nextNotification.status === 'filled') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        labelOptions: [{ label: 'Order completed' }],
        hasNoTimeout: false,
      });
    } else if (nextNotification.status === 'error') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order failed' }],
        hasNoTimeout: false,
      });
    } else if (nextNotification.status === 'pending') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        labelOptions: [{ label: 'Order pending' }],
        hasNoTimeout: false,
      });
    } else {
      return;
    }

    controller.deleteNotification(nextNotification.orderId);
  }, [activeOrdersState, controller, notifications, toastRef]);

  return { activeOrders };
};
