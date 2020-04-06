const initialState = {
	isVisible: false,
	autodismiss: null,
	status: undefined
};

const transactionNotificationReducer = (state = initialState, action) => {
	console.log('transactionNotificationReducer', action);
	switch (action.type) {
		case 'SHOW_TRANSACTION_NOTIFICATION':
			return {
				...state,
				isVisible: true,
				autodismiss: action.autodismiss,
				transactionId: action.transactionId,
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
