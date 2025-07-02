import { useCallback } from 'react';
import stateHasOrder from '../../utils/stateHasOrder';
import { addFiatOrder, FiatOrder } from '../../../../../reducers/fiatOrders';
import NotificationManager from '../../../../../core/NotificationManager';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import { getNotificationDetails } from '../utils';

function useHandleNewOrder() {
  const dispatchThunk = useThunkDispatch();

  return useCallback(
    async (order: FiatOrder) => {
      dispatchThunk((_dispatch, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        _dispatch(addFiatOrder(order));
        const notificationDetails = getNotificationDetails(order);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }
      });
    },
    [dispatchThunk],
  );
}

export default useHandleNewOrder;
