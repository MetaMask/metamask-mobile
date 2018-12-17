const initialState = {
	networkModalVisible: false
};

const modalsReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'TOGGLE_NETWORK_MODAL':
			return {
				...state,
				networkModalVisible: !state.networkModalVisible
			};
		default:
			return state;
	}
};
export default modalsReducer;
