/**
 * @typedef FiatOrder
 * @type {object}
 * @property {string} id - Original id given by Provider. Orders are identified by (provider, id)
 * @property {FIAT_ORDER_PROVIDERS}	provider : FIAT_PROVIDER,
 * @property {string} amount : 0.343
 * @property {string} fee : 0.3
 * @property {}	currency : "USD"
 * @property {FIAT_ORDER_STATES} state
 * @property {string} account : <account wallet address>
 * @property {string} network : <network>
 * @property {string|null} txHash : <transaction hash | null>
 * @property {}	data : original provider data
 */

/**
 * @enum {string}
 */
export const FIAT_ORDER_PROVIDERS = {
	WYRE: 'WYRE',
	WYRE_APPLE_PAY: 'WYRE_APPLE_PAY',
	TRANSAK: 'TRANSAK'
};

/**
 * @enum {string}
 */
export const FIAT_ORDER_STATES = {
	PENDING: 'PENDING',
	FAILED: 'FAILED',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED'
};

export const createPendingOrder = (id, provider, amount, fee, currency, account, network, data) => ({
	id,
	provider,
	amount,
	fee,
	currency,
	account,
	network,
	data,
	txHash: null,
	state: FIAT_ORDER_STATES.PENDING
});

const initialState = {
	orders: []
};

const findOrderIndex = (provider, id, orders) =>
	orders.findIndex(order => order.id === id && order.provider === provider);

const fiatOrderReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'FIAT_ADD_ORDER': {
			return {
				...state,
				orders: [...state.orders, action.payload]
			};
		}
		case 'FIAT_UPDATE_ORDER': {
			const orders = state.orders;
			const order = action.payload;
			const index = findOrderIndex(order.provider, order.id, state.orders);
			return {
				...state,
				orders: [
					...orders.slice(0, index),
					{
						...orders[index],
						...order
					},
					...orders.slice(index + 1)
				]
			};
		}
		case 'FIAT_RESET': {
			return initialState;
		}
		default: {
			return state;
		}
	}
};

export default fiatOrderReducer;
