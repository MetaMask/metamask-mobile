import { REHYDRATE } from 'redux-persist';

const initialState = {
	value: undefined,
	data: undefined,
	from: undefined,
	gas: undefined,
	gasPrice: undefined,
	to: undefined,
	selectedToken: undefined,
	selectedCollectible: undefined
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
		case 'SET_VALUE':
			return {
				...state,
				value: action.value
			};
		case 'SET_DATA':
			return {
				...state,
				data: action.data
			};
		case 'SET_FROM':
			return {
				...state,
				from: action.from
			};
		case 'SET_GAS':
			return {
				...state,
				gas: action.gas
			};
		case 'SET_GAS_PRICE':
			return {
				...state,
				gasPrice: action.gasPrice
			};
		case 'SET_TO':
			return {
				...state,
				to: action.to
			};
		case 'SET_SELECTED_TOKEN':
			return {
				...state,
				selectedToken: action.selectedToken
			};
		case 'SET_SELECTED_COLLECTIBLE':
			return {
				...state,
				selectedCollectible: action.selectedCollectible
			};
		case 'PREPARE_TRANSACTION':
			return {
				...state,
				gas: action.gas,
				gasPrice: action.gasPrice,
				value: action.value
			};
		case 'PREPARE_TOKEN_TRANSACTION':
			return {
				...state,
				gas: action.gas,
				gasPrice: action.gasPrice,
				value: action.value,
				to: action.to
			};
		case 'SANITIZE_TRANSACTION':
			return {
				...state,
				gas: action.gas,
				gasPrice: action.gasPrice
			};
		case 'SET_TRANSACTION_OBJECT':
			return {
				...state,
				...action.transaction
			};
		default:
			return state;
	}
};
export default transactionReducer;
