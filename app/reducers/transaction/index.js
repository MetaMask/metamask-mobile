import { REHYDRATE } from 'redux-persist';

const initialState = {
	value: undefined,
	data: undefined,
	from: undefined,
	gas: undefined,
	gasPrice: undefined,
	to: undefined,
	asset: undefined,
	selectedAsset: undefined,
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
		case 'SET_SELECTED_ASSET':
			return {
				...state,
				selectedAsset: action.asset
			};
		case 'SET_TRANSACTION_OBJECT':
			return {
				...state,
				...action.transaction
			};
		case 'SET_TOKENS_TRANSACTION':
			return {
				...state,
				type: 'TOKENS_TRANSACTION'
			};
		case 'SET_ETHER_TRANSACTION':
			return {
				...state,
				type: 'ETHER_TRANSACTION'
			};
		case 'SET_INDIVIDUAL_TOKEN_TRANSACTION':
			return {
				...state,
				asset: action.token,
				type: 'INDIVIDUAL_TOKEN_TRANSACTION'
			};
		case 'SET_INDIVIDUAL_COLLECTIBLE_TRANSACTION':
			return {
				...state,
				asset: action.collectible,
				type: 'INDIVIDUAL_COLLECTIBLE_TRANSACTION'
			};
		case 'SET_COLLECTIBLE_CONTRACT_TRANSACTION':
			return {
				...state,
				asset: action.contractCollectible,
				type: 'CONTRACT_COLLECTIBLE_TRANSACTION'
			};
		default:
			return state;
	}
};
export default transactionReducer;
