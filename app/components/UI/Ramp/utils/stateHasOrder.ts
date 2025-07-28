import { getOrders, FiatOrder } from '../../../../reducers/fiatOrders';
import { RootState } from '../../../../reducers';

function stateHasOrder(state: RootState, order: FiatOrder) {
  const orders = getOrders(state);
  return orders.some((o) => o.id === order.id);
}

export default stateHasOrder;
