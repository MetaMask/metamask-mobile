import { UserAction, UserActionType } from '../../actions/user/types';
import { AppThemeKey } from '../../util/theme/models';
import { UserState } from './types';

export * from './types';

export * from './selectors';

/**
 * Initial user state
 */
export const userInitialState: UserState = {
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

/**
 * User reducer
 */
/* eslint-disable @typescript-eslint/default-param-last */
const userReducer = (
  state: UserState = userInitialState,
  action: UserAction,
): UserState => {
  switch (action.type) {
    case UserActionType.LOGIN:
      return {
        ...state,
        userLoggedIn: true,
      };
    case UserActionType.LOGOUT:
      return {
        ...state,
        userLoggedIn: false,
      };
    case UserActionType.LOADING_SET:
      return {
        ...state,
        loadingSet: true,
        loadingMsg: action.loadingMsg,
      };
    case UserActionType.LOADING_UNSET:
      return {
        ...state,
        loadingSet: false,
      };
    case UserActionType.PASSWORD_SET:
      return {
        ...state,
        passwordSet: true,
      };
    case UserActionType.PASSWORD_UNSET:
      return {
        ...state,
        passwordSet: false,
      };
    case UserActionType.SEEDPHRASE_NOT_BACKED_UP:
      return {
        ...state,
        seedphraseBackedUp: false,
        backUpSeedphraseVisible: true,
      };
    case UserActionType.SEEDPHRASE_BACKED_UP:
      return {
        ...state,
        seedphraseBackedUp: true,
        backUpSeedphraseVisible: false,
      };
    case UserActionType.BACK_UP_SEEDPHRASE_VISIBLE:
      return {
        ...state,
        backUpSeedphraseVisible: true,
      };
    case UserActionType.BACK_UP_SEEDPHRASE_NOT_VISIBLE:
      return {
        ...state,
        backUpSeedphraseVisible: false,
      };
    case UserActionType.PROTECT_MODAL_VISIBLE:
      if (!state.seedphraseBackedUp) {
        return {
          ...state,
          protectWalletModalVisible: true,
        };
      }
      return state;
    case UserActionType.PROTECT_MODAL_NOT_VISIBLE:
      return {
        ...state,
        protectWalletModalVisible: false,
      };
    case UserActionType.SET_GAS_EDUCATION_CAROUSEL_SEEN:
      return {
        ...state,
        gasEducationCarouselSeen: true,
      };
    case UserActionType.SET_APP_THEME:
      return {
        ...state,
        appTheme: action.payload.theme,
      };
    default:
      return state;
  }
};
export default userReducer;
