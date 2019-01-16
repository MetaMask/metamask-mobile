const initialState = {
	isVisible: false,
	autodismiss: null,
	content: null
};

const alertReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'SHOW_ALERT':
			return {
				...state,
				isVisible: true,
				autodismiss: action.autodismiss,
				content: action.content
			};
		case 'HIDE_ALERT':
			return {
				...state,
				isVisible: false,
				autodismiss: null
			};
		default:
			return state;
	}
};
export default alertReducer;
