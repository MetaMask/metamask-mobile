import { createSelector } from 'reselect';
import { RootState } from '../reducers';

const selectUserState = (state: RootState) => state.user;

export const selectOAuthLoginSuccess = createSelector(
  selectUserState,
  (userState) => userState.oauth2LoginSuccess,
);

export const selectOAuthLoginError = createSelector(
  selectUserState,
  (userState) => userState.oauth2LoginError,
);
