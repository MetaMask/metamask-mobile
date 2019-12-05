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
	transactionToName: undefined,
	transactionFromName: undefined,
	transactionValue: undefined,
	type: undefined
};

const transactionReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...initialState
			};
		case 'RESET_TRANSACTION':
			return {
				...state,
				...initialState
			};
		case 'SET_RECIPIENT':
			return {
				...state,
				transaction: { ...state.transaction, from: action.from },
				ensRecipient: action.ensRecipient,
				transactionTo: action.to,
				transactionToName: action.transactionToName,
				transactionFromName: action.transactionFromName
			};
		case 'SET_SELECTED_ASSET':
			return {
				...state,
				selectedAsset: action.selectedAsset,
				assetType: action.assetType
			};
		case 'SET_VALUE':
			return {
				...state,
				transactionValue: action.value
			};
		case 'PREPARE_TRANSACTION':
			return {
				...state,
				transaction: action.transaction
			};
		default:
			return state;
	}
};
export default transactionReducer;
