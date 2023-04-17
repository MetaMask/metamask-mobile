import { combineReducers } from 'redux';
import { AppThemeKey } from '../../util/theme/models';
import { persistReducer } from 'redux-persist';
import Device from '../../util/device';
import Logger from '../../util/Logger';

import FilesystemStorage from 'redux-persist-filesystem-storage';

const initialState = {
  loadingMsg: '',
  loadingSet: false,
  passwordSet: false,
  seedphraseBackedUp: false,
  backUpSeedphraseVisible: false,
  protectWalletModalVisible: false,
  gasEducationCarouselSeen: false,
  nftDetectionDismissed: false,
  userLoggedIn: false,
  isAuthChecked: false,
  initialScreen: '',
};
const intialTheme = {
  appTheme: AppThemeKey.os,
};

const MigratedStorage2 = {
  async getItem(key) {
    try {
      const allKeys = await FilesystemStorage.getAllKeys();
      console.log('ALL KEYS', allKeys);
      const res = await FilesystemStorage.getItem(key);
      console.log('-----GETTING DEEP USER PERSIST', key, JSON.parse(res));
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      console.log('-----FAILING GETTING DEEP USER', error);
      //Fail silently
    }
  },
  async setItem(key, value) {
    try {
      console.log('-----SETTING ITEM OF DEEP USER');
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
  key: 'deep-user',
  storage: MigratedStorage2,
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        userLoggedIn: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        userLoggedIn: false,
      };
    case 'LOADING_SET':
      return {
        ...state,
        loadingSet: true,
        loadingMsg: action.loadingMsg,
      };
    case 'LOADING_UNSET':
      return {
        ...state,
        loadingSet: false,
      };
    case 'PASSWORD_SET':
      return {
        ...state,
        passwordSet: true,
      };
    case 'PASSWORD_UNSET':
      return {
        ...state,
        passwordSet: false,
      };
    case 'SEEDPHRASE_NOT_BACKED_UP':
      return {
        ...state,
        seedphraseBackedUp: false,
        backUpSeedphraseVisible: true,
      };
    case 'SEEDPHRASE_BACKED_UP':
      return {
        ...state,
        seedphraseBackedUp: true,
        backUpSeedphraseVisible: false,
      };
    case 'BACK_UP_SEEDPHRASE_VISIBLE':
      return {
        ...state,
        backUpSeedphraseVisible: true,
      };
    case 'BACK_UP_SEEDPHRASE_NOT_VISIBLE':
      return {
        ...state,
        backUpSeedphraseVisible: false,
      };
    case 'PROTECT_MODAL_VISIBLE':
      if (!state.seedphraseBackedUp) {
        return {
          ...state,
          protectWalletModalVisible: true,
        };
      }
      return state;
    case 'PROTECT_MODAL_NOT_VISIBLE':
      return {
        ...state,
        protectWalletModalVisible: false,
      };
    case 'SET_GAS_EDUCATION_CAROUSEL_SEEN':
      return {
        ...state,
        gasEducationCarouselSeen: true,
      };
    case 'SET_NFT_DETECTION_DISMISSED':
      return {
        ...state,
        nftDetectionDismissed: true,
      };
    default:
      return state;
  }
};

const themeReducer = (state = intialTheme, action) => {
  switch (action.type) {
    case 'SET_APP_THEME':
      return {
        ...state,
        appTheme: action.payload.theme,
      };
    default:
      return state;
  }
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

const userReducers = combineReducers({
  'deep-user': persistedUserReducer,
  appTheme: themeReducer,
});

export default userReducers;
