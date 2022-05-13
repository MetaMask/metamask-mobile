import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { processWyreApplePayOrder } from './wyreApplePay';
import { processTransakOrder } from './transak';
import { processMoonPayOrder } from './moonpay';
import Logger from '../../../../util/Logger';

function processOrder(order) {
  switch (order.provider) {
    case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY: {
      return processWyreApplePayOrder(order);
    }
    case FIAT_ORDER_PROVIDERS.TRANSAK: {
      return processTransakOrder(order);
    }
    case FIAT_ORDER_PROVIDERS.MOONPAY: {
      return processMoonPayOrder(order);
    }
    default: {
      Logger.error('FiatOrders::ProcessOrder unrecognized provider', order);
      return order;
    }
  }
}

export default processOrder;
