const initialState = {
  networkModalVisible: false,
  accountsModalVisible: false,
  collectibleContractModalVisible: false,
  receiveModalVisible: false,
  sdkLoadingModalVisible: false,
  channelDisconnectModalVisible: false,
  accountApprovalModalVisible: false,
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
    case 'TOGGLE_CHANNEL_DISCONNECT_MODAL':
      return {
        ...state,
        channelDisconnectModalVisible: !state.channelDisconnectModalVisible,
        // channelId: action?.channelId,
      };
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
      console.log(
        `action.visible=${action.visible} vs state=${state.accountApprovalModalVisible}`,
      );
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
