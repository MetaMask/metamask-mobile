import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import stateHasOrder from '../../utils/stateHasOrder';
import { addFiatOrder, FiatOrder } from '../../../../../reducers/fiatOrders';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import { RampsOrderStatus } from '@metamask/ramps-controller';
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
          showV2OrderToast({
            orderId: order.id,
            cryptocurrency: order.cryptocurrency,
            cryptoAmount: order.cryptoAmount,
            status: order.state as unknown as RampsOrderStatus,
          });
        });
      });
    },
    [dispatchThunk],
  );
}

export default useHandleNewOrder;
