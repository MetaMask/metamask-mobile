const initialState = {
  networkModalVisible: false,
  accountsModalVisible: false,
  collectibleContractModalVisible: false,
  receiveModalVisible: false,
  receiveAsset: undefined,
  dappTransactionModalVisible: false,
  approveModalVisible: false,
  ledgerTransactionModalVisible: false,
  ledgerSignMessageModalVisible: false,
  ledgerTransactionActionParams: {},
  ledgerSignMessageActionParams: {},
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
        dappTransactionModalVisible:
          action.show === null
            ? !state.dappTransactionModalVisible
            : action.show,
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
    case 'OPEN_LEDGER_TRANSACTION_ACTION': {
      return {
        ...state,
        ledgerTransactionModalVisible: true,
        ledgerTransactionActionParams: {
          ...state.ledgerTransactionActionParams,
          ...action.params,
        },
      };
    }
    case 'CLOSE_LEDGER_TRANSACTION_ACTION':
      return {
        ...state,
        ledgerTransactionModalVisible: false,
      };
    case 'OPEN_LEDGER_SIGN_ACTION': {
      return {
        ...state,
        ledgerSignMessageModalVisible: true,
        ledgerSignMessageActionParams: {
          ...state.ledgerSignMessageActionParams,
          ...action.params,
        },
      };
    }
    case 'CLOSE_LEDGER_SIGN_ACTION':
      return {
        ...state,
        ledgerSignMessageModalVisible: false,
      };
    default:
      return state;
  }
};
export default modalsReducer;
