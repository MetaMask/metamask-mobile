import { SDK } from '../sdk';
import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';

//* Helpers
// TODO: replace this with order status types imported from SDK
export const SDK_ORDER_STATUS = {
	Pending: 'PENDING',
	Failed: 'FAILED',
	Completed: 'COMPLETED',
	Cancelled: 'CANCELLED',
};
/**
 * Transforms an AggregatorOrder state into a FiatOrder state
 * @param {AGGREGATOR_ORDER_STATES} aggregatorOrderState
 */
const aggregatorOrderStateToFiatOrderState = (aggregatorOrderState) => {
	switch (aggregatorOrderState) {
		case SDK_ORDER_STATUS.Completed: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		case SDK_ORDER_STATUS.Failed: {
			return FIAT_ORDER_STATES.FAILED;
		}
		case SDK_ORDER_STATUS.Cancelled: {
			return FIAT_ORDER_STATES.CANCELLED;
		}
		default: {
			return FIAT_ORDER_STATES.PENDING;
		}
	}
};

export const aggregatorInitialFiatOrder = (initialOrder) => ({
	...initialOrder,
	state: FIAT_ORDER_STATES.PENDING,
	provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
	createdAt: Date.now(),
	amount: 0,
	fee: null,
	currency: '',
	cryptoAmount: null,
	cryptocurrency: '',
	data: null,
});

const aggregatorOrderToFiatOrder = (aggregatorOrder) => ({
	id: aggregatorOrder.id,
	provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
	createdAt: aggregatorOrder.createdAt,
	amount: aggregatorOrder.fiatAmount,
	fee: aggregatorOrder.totalFeesFiat,
	cryptoAmount: aggregatorOrder.cryptoAmount || 0,
	cryptoFee: aggregatorOrder.totalFeesFiat || 0,
	currency: aggregatorOrder.fiatCurrency?.symbol || '',
	currencySymbol: aggregatorOrder.fiatCurrency?.denomSymbol || '',
	cryptocurrency: aggregatorOrder.cryptoCurrency?.symbol || '',
	network: aggregatorOrder.cryptoCurrency?.network?.chainId || '',
	state: aggregatorOrderStateToFiatOrderState(aggregatorOrder.status),
	account: aggregatorOrder.walletAddress,
	txHash: aggregatorOrder.txHash,
	data: aggregatorOrder,
});

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processAggregatorOrder(order) {
	try {
		const orders = await SDK.orders();
		const updatedOrder = await orders.getOrder(order.id, order.account);

		if (!updatedOrder) {
			throw new Error('Payment Request Failed: empty order response');
		}

		return {
			...order,
			...aggregatorOrderToFiatOrder(updatedOrder),
		};
	} catch (error) {
		Logger.error(error, { message: 'FiatOrders::AggregatorProcessor error while processing order', order });
		return order;
	}
}

export const callbackBaseUrl = 'https://dummy.url.metamask.io';
