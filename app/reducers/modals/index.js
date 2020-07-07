const initialState = {
	networkModalVisible: false,
	accountsModalVisible: false,
	collectibleContractModalVisible: false,
	receiveModalVisible: false,
	receiveAsset: undefined,
	dappTransactionModalVisible: false
};

const modalsReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'TOGGLE_NETWORK_MODAL':
			return {
				...state,
				networkModalVisible: !state.networkModalVisible
			};
		case 'TOGGLE_RECEIVE_MODAL': {
			return {
				...state,
				receiveModalVisible: !state.receiveModalVisible,
				receiveAsset: action.asset
			};
		}
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
		case 'TOGGLE_DAPP_TRANSACTION_MODAL':
			return {
				...state,
				dappTransactionModalVisible: action.show === null ? !state.dappTransactionModalVisible : action.show
			};
		default:
			return state;
	}
};
export default modalsReducer;
