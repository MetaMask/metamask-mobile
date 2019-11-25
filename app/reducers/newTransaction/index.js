import { REHYDRATE } from 'redux-persist';

const initialState = {
	asset: undefined,
	assetType: undefined,
	ensRecipient: undefined,
	id: undefined,
	paymentChannelTransaction: false,
	readableValue: undefined,
	selectedAsset: undefined,
	transaction: {
		data: undefined,
		from: undefined,
		gas: undefined,
		gasPrice: undefined,
		nonce: undefined,
		to: undefined,
		value: undefined
	},
	type: undefined
};

const transactionReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...initialState
			};
		case 'NEW_TRANSACTION':
			return {
				...state,
				...initialState
			};
		case 'SET_RECIPIENT':
			return {
				transaction: { from: action.from, to: action.to, ...state.transaction },
				ensRecipient: action.ensRecipient,
				...state
			};
		default:
			return state;
	}
};
export default transactionReducer;
