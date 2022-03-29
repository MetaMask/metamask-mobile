import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';

//* Helpers

/**
 * Transforms a TransakOrder state into a FiatOrder state
 * @param {TRANSAK_ORDER_STATES} transakOrderState
 */
const aggregatorOrderStateToFiatOrderState = (aggregatorOrderState) => {
	switch (aggregatorOrderState) {
		case FIAT_ORDER_STATES.COMPLETED: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		case FIAT_ORDER_STATES.FAILED: {
			return FIAT_ORDER_STATES.FAILED;
		}
		case FIAT_ORDER_STATES.CANCELLED: {
			return FIAT_ORDER_STATES.CANCELLED;
		}
		default: {
			return FIAT_ORDER_STATES.PENDING;
		}
	}
};

const aggregatorOrderToFiatOrder = (aggregatorOrder) => ({
	id: aggregatorOrder.id,
	provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
	createdAt: aggregatorOrder.createdAt,
	amount: aggregatorOrder.fiatAmount,
	fee: aggregatorOrder.totalFeesFiat,
	cryptoAmount: '',
	cryptoFee: '',
	currency: aggregatorOrder.fiatCurrency?.symbol || '',
	cryptocurrency: aggregatorOrder.cryptoCurrency?.symbol || '',
	network: aggregatorOrder.cryptoCurrency?.network || '',
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

export const callbackBaseUrl = 'https://dummy.url.metamask.io';
