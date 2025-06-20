import { ProcessorOptions } from '../index';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';
import { processAggregatorOrder } from '../Aggregator/orderProcessor/aggregator';
import { processDepositOrder } from '../Deposit/orderProcessor';

function processOrder(
  order: FiatOrder,
  options?: ProcessorOptions,
): Promise<FiatOrder> | FiatOrder {
  switch (order.provider) {
    case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY:
    case FIAT_ORDER_PROVIDERS.TRANSAK:
    case FIAT_ORDER_PROVIDERS.MOONPAY: {
      return order;
    }
    case FIAT_ORDER_PROVIDERS.AGGREGATOR: {
      return processAggregatorOrder(order, options);
    }
    case FIAT_ORDER_PROVIDERS.DEPOSIT: {
      return processDepositOrder(order, options);
    }
    default: {
      const unrecognizedProviderError = new Error(
        'FiatOrders::ProcessOrder unrecognized provider',
      );
      Logger.error(unrecognizedProviderError, order);
      return order;
    }
  }
}

export default processOrder;
