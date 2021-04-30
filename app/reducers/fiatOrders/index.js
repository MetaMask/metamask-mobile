import { createSelector } from 'reselect';

/**
 * @typedef FiatOrder
 * @type {object}
 * @property {string} id - Original id given by Provider. Orders are identified by (provider, id)
 * @property {FIAT_ORDER_PROVIDERS}	provider Fiat Provider
 * @property {number} createdAt Fiat amount
 * @property {string} amount Fiat amount
 * @property {string?} fee Fiat fee
 * @property {string?} cryptoAmount Crypto currency amount
 * @property {string?} cryptoFee Crypto currency fee
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

/** Action Creators */

const ACTIONS = {
	FIAT_ADD_ORDER: 'FIAT_ADD_ORDER',
	FIAT_UPDATE_ORDER: 'FIAT_UPDATE_ORDER',
	FIAT_REMOVE_ORDER: 'FIAT_REMOVE_ORDER',
	FIAT_RESET: 'FIAT_RESET',
	FIAT_SET_CURRENCY: 'FIAT_SET_CURRENCY'
};

export const addFiatOrder = order => ({ type: ACTIONS.FIAT_ADD_ORDER, payload: order });
export const updateFiatOrder = order => ({ type: ACTIONS.FIAT_UPDATE_ORDER, payload: order });
export const setFiatOrdersCurrency = currency => ({ type: ACTIONS.FIAT_SET_CURRENCY, payload: currency });

/**
 * Selectors
 */

/**
 * Get the provider display name
 * @param {FIAT_ORDER_PROVIDERS} provider
 */
export const getProviderName = provider => {
	switch (provider) {
		case FIAT_ORDER_PROVIDERS.WYRE:
		case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY: {
			return 'Wyre';
		}
		case FIAT_ORDER_PROVIDERS.TRANSAK: {
			return 'Transak';
		}
		default: {
			return provider;
		}
	}
};

const ordersSelector = state => state.fiatOrders.orders || [];
const selectedAddressSelector = state => state.engine.backgroundState.PreferencesController.selectedAddress;
const networkSelector = state => state.engine.backgroundState.NetworkController.network;

export const fiatOrdersCurrencySelector = state => state.fiatOrders.selectedCurrency;

export const getOrders = createSelector(
	ordersSelector,
	selectedAddressSelector,
	networkSelector,
	(orders, selectedAddress, network) =>
		orders.filter(order => order.account === selectedAddress && order.network === network)
);

export const getPendingOrders = createSelector(
	ordersSelector,
	selectedAddressSelector,
	networkSelector,
	(orders, selectedAddress, network) =>
		orders.filter(
			order =>
				order.account === selectedAddress &&
				order.network === network &&
				order.state === FIAT_ORDER_STATES.PENDING
		)
);

export const getHasOrders = createSelector(
	getOrders,
	orders => orders.length > 0
);

const initialState = {
	orders: [],
	selectedCurrency: 'USD'
};

const findOrderIndex = (provider, id, orders) =>
	orders.findIndex(order => order.id === id && order.provider === provider);

const fiatOrderReducer = (state = initialState, action) => {
	switch (action.type) {
		case ACTIONS.FIAT_ADD_ORDER: {
			const orders = state.orders;
			const order = action.payload;
			const index = findOrderIndex(order.provider, order.id, orders);
			if (index !== -1) {
				return state;
			}
			return {
				...state,
				orders: [action.payload, ...state.orders]
			};
		}
		case ACTIONS.FIAT_UPDATE_ORDER: {
			const orders = state.orders;
			const order = action.payload;
			const index = findOrderIndex(order.provider, order.id, orders);
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
		case ACTIONS.FIAT_REMOVE_ORDER: {
			const orders = state.orders;
			const order = action.payload;
			const index = findOrderIndex(order.provider, order.id, state.orders);
			return {
				...state,
				orders: [...orders.slice(0, index), ...orders.slice(index + 1)]
			};
		}
		case ACTIONS.FIAT_RESET: {
			return initialState;
		}
		case ACTIONS.FIAT_SET_CURRENCY: {
			return {
				...state,
				selectedCurrency: action.payload
			};
		}
		default: {
			return state;
		}
	}
};

export default fiatOrderReducer;
