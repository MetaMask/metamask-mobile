const initialState = {
	isVisible: false,
	autodismiss: null,
	status: undefined,
	transaction: undefined
};

const transactionNotificationReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'SHOW_TRANSACTION_NOTIFICATION':
			return {
				...state,
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
		default:
			return state;
	}
};
export default transactionNotificationReducer;
