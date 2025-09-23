import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import { RootState } from '../../../../reducers';
import getDepositAnalyticsPayload from '../Deposit/utils/getDepositAnalyticsPayload';
import getAggregatorAnalyticsPayload from '../Aggregator/utils/getAggregatorAnalyticsPayload';

function getOrderAnalyticsPayload(updatedOrder: FiatOrder, state: RootState) {
  let event, params;
  if (updatedOrder.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR) {
    return getAggregatorAnalyticsPayload(updatedOrder);
  } else if (updatedOrder.provider === FIAT_ORDER_PROVIDERS.DEPOSIT) {
    return getDepositAnalyticsPayload(updatedOrder, state);
  }
  return [event, params];
}
export default getOrderAnalyticsPayload;
