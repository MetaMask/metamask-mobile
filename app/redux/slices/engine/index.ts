import Engine from '../../../core/Engine';
import { persistReducer } from 'redux-persist';
import { combineReducers } from 'redux';
// import { createAction } from '@reduxjs/toolkit';
// import Logger from '../../../util/Logger';
// import { Platform } from 'react-native';
import MigratedStorage from '../../storage/MigratedStorage';

const controllerNames = [
  { name: 'AccountTrackerController', initialState: {} },
  { name: 'AddressBookController', initialState: {} },
  { name: 'AssetsContractController', initialState: {} },
  { name: 'NftController', initialState: {} },
  { name: 'TokensController', initialState: {} },
  { name: 'TokenDetectionController', initialState: {} },
  { name: 'NftDetectionController', initialState: {} },
  {
    name: 'KeyringController',
    initialState: {},
  },
  { name: 'AccountTrackerController', initialState: {} },
  {
    name: 'NetworkController',
    initialState: {},
  },
  {
    name: 'PhishingController',
    initialState: {},
    denyList: ['phishing', 'whitelist'],
  },
  { name: 'PreferencesController', initialState: {} },
  { name: 'TokenBalancesController', initialState: {} },
  { name: 'TokenRatesController', initialState: {} },
  { name: 'TransactionController', initialState: {} },
  {
    name: 'SwapsController',
    initialState: {},
    denyList: [
      'aggregatorMetadata',
      'aggregatorMetadataLastFetched',
      'chainCache',
      'tokens',
      'tokensLastFetched',
      'topAssets',
      'topAssetsLastFetched',
    ],
  },
  {
    name: 'TokenListController',
    initialState: {},
    denyList: ['tokenList, tokensChainCache'],
  },
  {
    name: 'CurrencyRateController',
    initialState: {},
  },
  {
    name: 'GasFeeController',
    initialState: {},
  },
  {
    name: 'ApprovalController',
    initialState: {},
  },
  {
    name: 'PermissionController',
    initialState: {},
  },
  {
    name: 'LoggingController',
    initialState: {},
  },
];

// Create an action to initialize the background state
// export const initBgState = (controllerName: string) =>
//   createAction(`INIT_BG_STATE_${controllerName}`, (key) => ({
//     payload: key,
//   }));

// Create an action to update the background state
// export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
//   payload: key,
// }));

// export const updateBgState = (controllerName: string) =>
//   createAction(`UPDATE_BG_STATE_${controllerName}`, (key) => ({
//     payload: key,
//   }));

const controllerPersistConfig = (controllerName: any, denyList?: string[]) => ({
  key: controllerName,
  blacklist: denyList,
  storage: MigratedStorage,
});

const controllerReducer =
  ({
    controllerName,
    initialState,
  }: {
    controllerName: string;
    initialState: any;
  }) =>
  // eslint-disable-next-line @typescript-eslint/default-param-last
  (state = initialState, action: any) => {
    switch (action.type) {
      case `INIT_BG_STATE_${controllerName || action.key}`: {
        const initialEngineValue =
          Engine.state[controllerName as keyof typeof Engine.state];
        const returnedState = {
          ...state,
          ...initialEngineValue,
        };

        return returnedState;
      }
      case `UPDATE_BG_STATE_${controllerName}`: {
        return { ...Engine.state[controllerName as keyof typeof Engine.state] };
      }
      default:
        return state;
    }
  };

export const controllerReducers = controllerNames.reduce(
  (output, controllerConfig) => {
    const { name, initialState, denyList = [] } = controllerConfig;

    const reducer = persistReducer(
      controllerPersistConfig(name, denyList),
      controllerReducer({ controllerName: name, initialState }),
    );

    output[name] = reducer;
    return output;
  },
  {},
);

const engineReducer = combineReducers({
  backgroundState: combineReducers(controllerReducers),
});

export default engineReducer;
