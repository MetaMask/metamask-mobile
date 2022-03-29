import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';

const aggregatorOrderToFiatOrder = (aggregatorOrder) => ({
	id: aggregatorOrder.id,
	provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
	createdAt: aggregatorOrder.createdAt,
	amount: aggregatorOrder.fiatAmount,
	fee: aggregatorOrder.totalFeesFiat,
	cryptoAmount: '',
	cryptoFee: '',
	currency: aggregatorOrder.fiatCurrency?.symbol || '',
	cryptoCurrency: aggregatorOrder.cryptoCurrency?.symbol || '',
	network: aggregatorOrder.cryptoCurrency?.network || '',
	state: aggregatorOrder.status,
	account: aggregatorOrder.walletAddress,
	txHash: aggregatorOrder.txHash,
	data: aggregatorOrder,
});

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */
// eslint-disable-next-line import/prefer-default-export
export async function processAggregatorOrder(order, sdk) {
	try {
		if (sdk) {
			const updatedOrder = await sdk.getOrder(order.id, order.account);

			if (!updatedOrder) {
				throw new Error('Payment Request Failed: empty order response');
			}

			return {
				...order,
				...aggregatorOrderToFiatOrder(updatedOrder),
			};
		}
	} catch (error) {
		Logger.error(error, { message: 'FiatOrders::AggregatorProcessor error while processing order', order });
		return order;
	}
}
