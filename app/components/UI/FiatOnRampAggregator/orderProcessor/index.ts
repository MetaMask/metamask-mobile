import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { processWyreApplePayOrder } from '../../FiatOrders/orderProcessor/wyreApplePay';
import { processTransakOrder } from '../../FiatOrders/orderProcessor/transak';
import { processMoonPayOrder } from '../../FiatOrders/orderProcessor/moonpay';
import Logger from '../../../../util/Logger';
import { processAggregatorOrder } from './aggregator';

function processOrder(order: any) {
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
