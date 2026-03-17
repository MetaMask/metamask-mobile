import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import stateHasOrder from '../../utils/stateHasOrder';
import { addFiatOrder, FiatOrder } from '../../../../../reducers/fiatOrders';
import NotificationManager from '../../../../../core/NotificationManager';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import { getNotificationDetails } from '../utils';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import { showV2OrderToast } from '../../utils/v2OrderToast';

function useHandleNewOrder() {
  const dispatchThunk = useThunkDispatch();
  const isV2Enabled = useRampsUnifiedV2Enabled();

  return useCallback(
    async (order: FiatOrder) => {
      dispatchThunk((_dispatch, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        _dispatch(addFiatOrder(order));
        InteractionManager.runAfterInteractions(() => {
          if (isV2Enabled) {
            showV2OrderToast({
              orderId: order.id,
              cryptocurrency: order.cryptocurrency,
              cryptoAmount: order.cryptoAmount,
              status: order.state as unknown as RampsOrderStatus,
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
    [dispatchThunk, isV2Enabled],
  );
}

export default useHandleNewOrder;
