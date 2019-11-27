import { REHYDRATE } from 'redux-persist';

const initialState = {
	asset: undefined,
	assetType: undefined,
	ensRecipient: undefined,
	id: undefined,
	paymentChannelTransaction: false,
	readableValue: undefined,
	selectedAsset: {},
	transaction: {
		data: undefined,
		from: undefined,
		gas: undefined,
		gasPrice: undefined,
		nonce: undefined,
		to: undefined,
		value: undefined
	},
	transactionTo: undefined,
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
				...state,
				transaction: { from: action.from, ...state.transaction },
				ensRecipient: action.ensRecipient,
				transactionTo: action.to
			};
		case 'SET_SELECTED_ASSET':
			return {
				...state,
				selectedAsset: action.selectedAsset
			};
		default:
			return state;
	}
};
export default transactionReducer;
