const initialState = {
  networkModalVisible: false,
  shouldNetworkSwitchPopToWallet: false,
  collectibleContractModalVisible: false,
  dappTransactionModalVisible: false,
  signMessageModalVisible: true,
  slowRpcConnectionBannerVisible: false,
  slowRpcConnectionChainId: null,
};

const modalsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'TOGGLE_NETWORK_MODAL':
      return {
        ...state,
        networkModalVisible: !state.networkModalVisible,
        shouldNetworkSwitchPopToWallet: action.shouldNetworkSwitchPopToWallet,
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
    case 'TOGGLE_INFO_NETWORK_MODAL':
      if (action.show === false) {
        return {
          ...state,
          infoNetworkModalVisible: false,
        };
      }
      return {
        ...state,
        infoNetworkModalVisible: !state.infoNetworkModalVisible,
      };
    case 'TOGGLE_SIGN_MODAL':
      if (action.show === false) {
        return {
          ...state,
          signMessageModalVisible: false,
        };
      }
      return {
        ...state,
        signMessageModalVisible: !state.signMessageModalVisible,
      };
    case 'TOGGLE_SLOW_RPC_CONNECTION_BANNER':
      return {
        ...state,
        slowRpcConnectionBannerVisible:
          action.visible ?? !state.slowRpcConnectionBannerVisible,
        slowRpcConnectionChainId:
          action.visible === false
            ? null
            : action.chainId || state.slowRpcConnectionChainId,
      };
    default:
      return state;
  }
};
export default modalsReducer;
