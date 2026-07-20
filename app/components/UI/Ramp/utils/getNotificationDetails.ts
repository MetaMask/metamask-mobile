import { DepositOrderType } from '../types/legacyDeposit';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import { getNotificationDetails as getAggregatorNotificationDetails } from '../Aggregator/utils';
import { getNotificationDetails as getDepositNotificationDetails } from './depositUtils';

function getNotificationDetails(order: FiatOrder) {
  if (order.orderType === DepositOrderType.Deposit) {
    return getDepositNotificationDetails(order);
  }

  return getAggregatorNotificationDetails(order);
}

export default getNotificationDetails;
