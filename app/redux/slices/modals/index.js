import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

const initialState = {
  networkModalVisible: false,
  shouldNetworkSwitchPopToWallet: true,
  collectibleContractModalVisible: false,
  receiveModalVisible: false,
  receiveAsset: undefined,
  dappTransactionModalVisible: false,
};

const reducer = (state = initialState, action) => {
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
    default:
      return state;
  }
};

const modalsConfig = {
  key: 'modals',
  blacklist: [],
  storage: MigratedStorage,
};

const modalsReducer = persistReducer(modalsConfig, reducer);

export default modalsReducer;
