import bookmarksReducer from './bookmarks';
import browserReducer from './browser';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import userReducer from './user';
import wizardReducer from './wizard';
import onboardingReducer from './onboarding';
import fiatOrders from './fiatOrders';
import swapsReducer from './swaps';
import notificationReducer from './notification';
import infuraAvailabilityReducer from './infuraAvailability';
import collectiblesReducer from './collectibles';
import recentsReducer from './recents';
import navigationReducer from './navigation';
import networkOnboardReducer from './networkSelector';
import securityReducer from './security';
import { combineReducers } from 'redux';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Logger from '../util/Logger';
import Device from '../util/device';
import { persistReducer } from 'redux-persist';

const MigratedStorage = {
  async getItem(key) {
    try {
      const allKeys = await FilesystemStorage.getAllKeys();
      console.log('ALL KEYS', allKeys);
      const res = await FilesystemStorage.getItem(key);
      console.log('-----GETTING SETTINGS PERSIST', key, JSON.parse(res));
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      console.log('-----FAILING GETTING SETTINGS', error);
      //Fail silently
    }
  },
  async setItem(key, value) {
    try {
      console.log('-----SETTING ITEM OF SETTINGS');
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

const MigratedStorage2 = {
  async getItem(key) {
    try {
      const allKeys = await FilesystemStorage.getAllKeys();
      console.log('ALL KEYS', allKeys);
      const res = await FilesystemStorage.getItem(key);
      console.log('-----GETTING USER PERSIST', key, JSON.parse(res));
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      console.log('-----FAILING GETTING USER', error);
      //Fail silently
    }
  },
  async setItem(key, value) {
    try {
      console.log('-----SETTING ITEM OF USER');
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

const persistConfig = {
  key: 'settings',
  storage: MigratedStorage,
  stateReconciler: autoMergeLevel2,
};

const userPersistConfig = {
  key: 'user',
  storage: MigratedStorage2,
  blacklist: ['deep-user'],
};

// const persistConfig = {
//   key: 'root',
//   version,
//   blacklist: ['onboarding'],
//   storage: MigratedStorage,
//   transforms: [persistTransform, persistUserTransform],
//   stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
//   migrate: createMigrate(migrations, { debug: false }),
//   writeFailHandler: (error) =>
//     Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
// };

const rootReducer = combineReducers({
  settings: persistReducer(persistConfig, settingsReducer),
  // collectibles: collectiblesReducer,
  engine: engineReducer,
  // privacy: privacyReducer,
  // bookmarks: bookmarksReducer,
  // recents: recentsReducer,
  // browser: browserReducer,
  // modals: modalsReducer,
  // settings: lol,
  // alert: alertReducer,
  // transaction: transactionReducer,
  user: persistReducer(userPersistConfig, userReducer),
  // wizard: wizardReducer,
  // onboarding: onboardingReducer,
  // notification: notificationReducer,
  // swaps: swapsReducer,
  // fiatOrders,
  // infuraAvailability: infuraAvailabilityReducer,
  // navigation: navigationReducer,
  // networkOnboarded: networkOnboardReducer,
  // security: securityReducer,
});

export default rootReducer;
