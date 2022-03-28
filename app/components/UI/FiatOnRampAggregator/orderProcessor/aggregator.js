/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */

// eslint-disable-next-line import/prefer-default-export
export async function processAggregatorOrder(order, sdk) {
	if (sdk) {
		const updatedOrder = await sdk.getOrder(order.id, order.account);
		return updatedOrder;
	}

	return order;
}
