const initialState = {
  networkModalVisible: false,
  shouldNetworkSwitchPopToWallet: true,
  collectibleContractModalVisible: false,
  receiveModalVisible: false,
  sdkLoadingModalVisible: false,
  receiveAsset: undefined,
  dappTransactionModalVisible: false,
  approveModalVisible: false,
};

const modalsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'TOGGLE_NETWORK_MODAL':
      return {
        ...state,
        networkModalVisible: !state.networkModalVisible,
        shouldNetworkSwitchPopToWallet: action.shouldNetworkSwitchPopToWallet,
      };
    case 'TOGGLE_RECEIVE_MODAL': {
      return {
        ...state,
        receiveModalVisible: !state.receiveModalVisible,
        receiveAsset: action.asset,
      };
    }
    case 'TOGGLE_SDKLOADING_MODAL':
      if (typeof action.visible !== undefined) {
        return {
          ...state,
          sdkLoadingModalVisible: action.visible,
        };
      }
      return {
        ...state,
        sdkLoadingModalVisible: !state.sdkLoadingModalVisible,
      };
    case 'TOGGLE_ACCOUNT_APPROVAL_MODAL':
      if (typeof action.visible !== undefined) {
        return {
          ...state,
          accountApprovalModalVisible: action.visible,
        };
      }
      return {
        ...state,
        accountApprovalModalVisible: action.visible,
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
    default:
      return state;
  }
};
export default modalsReducer;
