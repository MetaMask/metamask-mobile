/**
 * @typedef FiatOrder
 * @type {object}
 * @property {string} id - Original id given by Provider. Orders are identified by (provider, id)
 * @property {FIAT_ORDER_PROVIDERS}	provider Fiat Provider
 * @property {string} amount Fiat amount
 * @property {string} fee Fiat fee
 * @property {string} cryptoAmount Crypto currency amount
 * @property {string} cryptoFee Crypto currency fee
 * @property {string} currency "USD"
 * @property {string} cryptocurrency "ETH"
 * @property {FIAT_ORDER_STATES} state Order state
 * @property {string} account <account wallet address>
 * @property {string} network <network>
 * @property {?string} txHash <transaction hash | null>
 * @property {object} data original provider data
 * @property {object} data.order : Wyre order response
 * @property {object} data.transfer : Wyre transfer response
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
