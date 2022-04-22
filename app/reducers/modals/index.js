const initialState = {
	networkModalVisible: false,
	accountsModalVisible: false,
	collectibleContractModalVisible: false,
	receiveModalVisible: false,
	receiveAsset: undefined,
	dappTransactionModalVisible: false,
	approveModalVisible: false,
	ledgerTransactionModalVisible: false,
};

const modalsReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'TOGGLE_NETWORK_MODAL':
			return {
				...state,
				networkModalVisible: !state.networkModalVisible,
			};
		case 'TOGGLE_RECEIVE_MODAL': {
			return {
				...state,
				receiveModalVisible: !state.receiveModalVisible,
				receiveAsset: action.asset,
			};
		}
		case 'TOGGLE_ACCOUNT_MODAL':
			return {
				...state,
				accountsModalVisible: !state.accountsModalVisible,
			};
		case 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL':
			return {
				...state,
				collectibleContractModalVisible: !state.collectibleContractModalVisible,
			};
		case 'TOGGLE_DAPP_TRANSACTION_MODAL':
			if (action.show === false) {
				return {
					...state,
					dappTransactionModalVisible: false,
				};
			}
			return {
				...state,
				dappTransactionModalVisible: action.show === null ? !state.dappTransactionModalVisible : action.show,
			};
		case 'TOGGLE_APPROVE_MODAL':
			if (action.show === false) {
				return {
					...state,
					approveModalVisible: false,
				};
			}
			return {
				...state,
				approveModalVisible: !state.approveModalVisible,
			};
		case 'TOGGLE_LEDGER_TRANSACTION':
			return {
				...state,
				ledgerTransactionModalVisible: !state.ledgerTransactionModalVisible,
			};
		default:
			return state;
	}
};
export default modalsReducer;
