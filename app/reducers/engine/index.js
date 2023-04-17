import { combineReducers } from 'redux';
import Engine from '../../core/Engine';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Logger from '../../util/Logger';
import Device from '../../util/device';
import { persistReducer } from 'redux-persist';

const controllerNames = [
  { name: 'AccountTrackerController', initialState: {} },
  { name: 'AddressBookController', initialState: {} },
  { name: 'AssetsContractController', initialState: {} },
  { name: 'NftController', initialState: {} },
  { name: 'TokensController', initialState: {} },
  { name: 'TokenDetectionController', initialState: {} },
  { name: 'NftDetectionController', initialState: {} },
  { name: 'KeyringController', initialState: {} },
  { name: 'AccountTrackerController', initialState: {} },
  { name: 'NetworkController', initialState: {} },
  { name: 'PhishingController', initialState: {} },
  { name: 'PreferencesController', initialState: {} },
  { name: 'TokenBalancesController', initialState: {} },
  { name: 'TokenRatesController', initialState: {} },
  { name: 'TransactionController', initialState: {} },
  { name: 'TypedMessageManager', initialState: {} },
  { name: 'SwapsController', initialState: {} },
  { name: 'TokenListController', initialState: {} },
  { name: 'CurrencyRateController', initialState: {} },
  { name: 'GasFeeController', initialState: {} },
  { name: 'ApprovalController', initialState: {} },
  { name: 'PermissionController', initialState: {} },
];

const MigratedStorage = {
  async getItem(key) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      //Fail silently
    }
  },
  async setItem(key, value) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      Logger.error(error, { message: 'Failed to set item' });
    }
  },
  async removeItem(key) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error, { message: 'Failed to remove item' });
    }
  },
};

const controllerPersistConfig = (controllerName) => ({
  key: controllerName,
  storage: MigratedStorage,
});

const controllerReducer =
  (controllerName, initialState) =>
  (state = initialState, action) => {
    switch (action.type) {
      case `UPDATE_BG_STATE_${controllerName}`: {
        const newState = { ...state };
        state = Engine.state[action.key];
        return newState;
      }
      default:
        return state;
    }
  };

const controllerReducers = controllerNames.reduce(
  (output, { name, initialState }) => {
    output[name] = persistReducer(
      controllerPersistConfig(name),
      controllerReducer(name, initialState),
    );
    return output;
  },
  {},
);

const engineReducer = combineReducers(controllerReducers);

export default engineReducer;
