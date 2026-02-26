import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import stateHasOrder from '../../utils/stateHasOrder';
import { addFiatOrder, FiatOrder } from '../../../../../reducers/fiatOrders';
import NotificationManager from '../../../../../core/NotificationManager';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import { getNotificationDetails } from '../utils';
import { selectRampsUnifiedBuyV2ActiveFlag } from '../../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';
import { showV2OrderToast } from '../../utils/v2OrderToast';

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
        InteractionManager.runAfterInteractions(() => {
          const isV2 = selectRampsUnifiedBuyV2ActiveFlag(state);
          if (isV2) {
            showV2OrderToast({
              orderId: order.id,
              cryptocurrency: order.cryptocurrency,
              cryptoAmount: order.cryptoAmount,
              state: order.state,
            });
          } else {
            const notificationDetails = getNotificationDetails(order);
            if (notificationDetails) {
              NotificationManager.showSimpleNotification(notificationDetails);
            }
          }
        });
      });
    },
    [dispatchThunk],
  );
}

export default useHandleNewOrder;
