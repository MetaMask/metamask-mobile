/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */

import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';

// eslint-disable-next-line import/prefer-default-export
export async function processAggregatorOrder(order, sdk) {
	const transformOrder = (order) => ({
		...order,
		provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
		network: order.cryptoCurrency?.network || '',
		amount: order.fiatAmount,
		fee: order.totalFeesFiat,
		currency: order.fiatCurrency?.symbol || '',
		cryptoCurrency: order.cryptoCurrency?.symbol || '',
		providerInfo: order.provider,
		state: order.status,
		account: order.walletAddress,
		data: order,
	});

	if (sdk) {
		const updatedOrder = await sdk.getOrder(order.id, order.account);
		const transformedOrder = transformOrder(updatedOrder);

		return transformedOrder;
	}

	return order;
}
