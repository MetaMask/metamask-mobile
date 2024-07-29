import { AppThemeKey } from '../../util/theme/models';

export interface IUserReducer {
  loadingMsg: string;
  loadingSet: boolean;
  passwordSet: boolean;
  seedphraseBackedUp: boolean;
  backUpSeedphraseVisible: boolean;
  protectWalletModalVisible: boolean;
  gasEducationCarouselSeen: boolean;
  userLoggedIn: boolean;
  isAuthChecked: boolean;
  initialScreen: string;
  appTheme: AppThemeKey;
  ambiguousAddressEntries: Record<string, unknown>;
}

export const userInitialState = {
  loadingMsg: '',
  loadingSet: false,
  passwordSet: false,
  seedphraseBackedUp: false,
  backUpSeedphraseVisible: false,
  protectWalletModalVisible: false,
  gasEducationCarouselSeen: false,
  userLoggedIn: false,
  isAuthChecked: false,
  initialScreen: '',
  appTheme: AppThemeKey.os,
  ambiguousAddressEntries: {},
};

// Define action types
type UserAction =
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'LOADING_SET'; loadingMsg: string }
  | { type: 'LOADING_UNSET' }
  | { type: 'PASSWORD_SET' }
  | { type: 'PASSWORD_UNSET' }
  | { type: 'SEEDPHRASE_NOT_BACKED_UP' }
  | { type: 'SEEDPHRASE_BACKED_UP' }
  | { type: 'BACK_UP_SEEDPHRASE_VISIBLE' }
  | { type: 'BACK_UP_SEEDPHRASE_NOT_VISIBLE' }
  | { type: 'PROTECT_MODAL_VISIBLE' }
  | { type: 'PROTECT_MODAL_NOT_VISIBLE' }
  | { type: 'SET_GAS_EDUCATION_CAROUSEL_SEEN' }
  | { type: 'SET_APP_THEME'; payload: { theme: AppThemeKey } };

const userReducer = (
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state: IUserReducer = userInitialState,
  action: UserAction,
) => {
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
    case 'SET_APP_THEME':
      return {
        ...state,
        appTheme: action.payload.theme,
      };
    default:
      return state;
  }
};
export default userReducer;
