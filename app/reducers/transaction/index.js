const initialState = {
	amount: undefined,
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
		case 'NEW_TRANSACTION':
			return {
				initialState
			};
		case 'SET_AMOUNT':
			return {
				...state,
				amount: action.amount
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
		default:
			return state;
	}
};
export default transactionReducer;
