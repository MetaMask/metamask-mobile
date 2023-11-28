import Engine from '../../../Engine';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { persistReducer } from 'redux-persist';
import { combineReducers } from 'redux';
import { createAction } from '@reduxjs/toolkit';
import Logger from '../../../../util/Logger';
import { Platform } from 'react-native';

// const initialState = {
//   backgroundState: {} as any,
// };

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

const MigratedStorage = {
  async getItem(key: string) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to run migration' });
      throw new Error('Failed Filesystem Storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Platform.OS === 'ios');
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to set item' });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to remove item' });
    }
  },
};

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
    // console.log('ACTION TYPE:', action, ' Controller Name: ', controllerName); // <- this runs but controllerName is undefined
    // console.log('ACTION TYPE:', action);
    switch (action.type) {
      case `INIT_BG_STATE_${controllerName || action.key}`: {
        // <- i think there's something going on when creating these names
        // when the app first runs, it runs
        console.log('ACTION INITIALISE ********', action);
        if (controllerName === 'NetworkController') {
          console.log('Reducer - STORE INITIAL STATE: ', state);
          console.log(
            'Reducer - ENGINE INITIAL STATE: ',
            !!Engine,
            Engine.state[controllerName],
          );
        }
        const initialEngineValue =
          Engine.state[controllerName as keyof typeof Engine.state];
        const returnedObject = {
          ...state,
          ...initialEngineValue,
        };
        if (controllerName === 'NetworkController') {
          console.log('initial Value:', initialEngineValue);
          console.log('Returned Object :', returnedObject);
        }
        return returnedObject;
      }
      case `UPDATE_BG_STATE_${controllerName}`: {
        console.log('ACTION UPDATE ********', action);

        // newState[controllerName] =
        //   Engine.state[controllerName as keyof typeof Engine.state];
        if (controllerName === 'NetworkController') {
          console.log('Update new State Value:', {
            ...Engine.state[controllerName as keyof typeof Engine.state],
          });
        }
        return { ...Engine.state[controllerName as keyof typeof Engine.state] };
      }
      default:
        return state;
    }
  };

export const controllerReducers = controllerNames.reduce(
  (output, controllerConfig) => {
    const { name, initialState, denyList = [] } = controllerConfig;
    // console.log('REDUCER NAME =============,', name);

    // Log the action type associated with the reducer
    const INIT_BG_STATE_KEY = `INIT_BG_STATE_${name}`;
    const UPDATE_BG_STATE_KEY = `UPDATE_BG_STATE_${name}`;
    console.log('INIT ACTION TYPE:', INIT_BG_STATE_KEY);
    console.log('UPDATE ACTION TYPE:', UPDATE_BG_STATE_KEY);

    const reducer = persistReducer(
      controllerPersistConfig(name, denyList),
      controllerReducer({ controllerName: name, initialState }),
    );
    // Log the properties of the reducer
    // console.log(`REDUCER CONTENT for ${name}:`, {
    //   name,
    //   initialState,
    //   denyList,
    //   reducerFunction: reducer,
    // });

    output[name] = reducer;
    return output;
  },
  {},
);

// Log the final object after the loop is complete
console.log('FINAL REDUCERS OBJECT ===========', controllerReducers);

const engineReducer = combineReducers({
  backgroundState: combineReducers(controllerReducers),
});
// RECOVERY PHRASE: buzz pill embody elite name festival crystal pigeon grief memory allow blue

// const engineReducer = (
//   // eslint-disable-next-line @typescript-eslint/default-param-last
//   state = initialState,
//   action: PayloadAction<{ key: any } | undefined>,
// ) => {
//   switch (action.type) {
//     case initBgState.type: {
//       return { backgroundState: Engine.state };
//     }
//     case updateBgState.type: {
//       const newState = { ...state };
//       if (action.payload) {
//         newState.backgroundState[action.payload?.key] =
//           Engine.state[action.payload.key as keyof typeof Engine.state];
//       }
//       return newState;
//     }
//     default:
//       return state;
//   }
// };

export default engineReducer;
