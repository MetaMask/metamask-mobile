import { FIAT_ORDER_PROVIDERS } from '../../../../reducers/fiatOrders';
import { processWyreApplePayOrder } from './wyreApplePay';
import { processTransakOrder } from './transak';
import Logger from '../../../../util/Logger';

function processOrder(order) {
	switch (order.provider) {
		case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY: {
			return processWyreApplePayOrder(order);
		}
		case FIAT_ORDER_PROVIDERS.TRANSAK: {
			return processTransakOrder(order);
		}
		default: {
			Logger.message('FiatOrders::ProcessOrder unrecognized provider', order);
			return order;
		}
	}
}

export default processOrder;
