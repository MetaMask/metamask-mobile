const initialState = {
	networkModalVisible: false,
	accountsModalVisible: false,
	collectibleContractModalVisible: false
};

const modalsReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'TOGGLE_NETWORK_MODAL':
			return {
				...state,
				networkModalVisible: !state.networkModalVisible
			};
		case 'TOGGLE_ACCOUNT_MODAL':
			return {
				...state,
				accountsModalVisible: !state.accountsModalVisible
			};
		case 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL':
			return {
				...state,
				collectibleContractModalVisible: !state.collectibleContractModalVisible
			};
		default:
			return state;
	}
};
export default modalsReducer;
