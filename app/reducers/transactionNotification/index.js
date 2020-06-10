const initialState = {
	type: undefined,
	isVisible: false,
	autodismiss: null,
	status: undefined,
	transaction: undefined,
	title: undefined,
	description: undefined
};

const transactionNotificationReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'SHOW_TRANSACTION_NOTIFICATION':
			return {
				...state,
				type: 'transaction',
				isVisible: true,
				autodismiss: action.autodismiss,
				transaction: action.transaction,
				status: action.status
			};
		case 'HIDE_TRANSACTION_NOTIFICATION':
			return {
				...state,
				isVisible: false,
				autodismiss: null
			};
		case 'SHOW_SIMPLE_NOTIFICATION': {
			return {
				...state,
				type: 'simple',
				isVisible: true,
				autodismiss: action.autodismiss,
				title: action.title,
				description: action.description,
				status: action.status
			};
		}
		default:
			return state;
	}
};
export default transactionNotificationReducer;
