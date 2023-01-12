import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';
import { processAggregatorOrder } from './aggregator';

function processOrder(order: FiatOrder): Promise<FiatOrder> | FiatOrder {
  switch (order.provider) {
    case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY:
    case FIAT_ORDER_PROVIDERS.TRANSAK:
    case FIAT_ORDER_PROVIDERS.MOONPAY: {
      return order;
    }
    case FIAT_ORDER_PROVIDERS.AGGREGATOR: {
      return processAggregatorOrder(order);
    }
    default: {
      Logger.error('FiatOrders::ProcessOrder unrecognized provider', order);
      return order;
    }
  }
}

export default processOrder;
