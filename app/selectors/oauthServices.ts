import { createSelector } from 'reselect';
import { RootState } from '../reducers';

const selectUserState = (state: RootState) => state.user;

export const selectOauth2LoginSuccess = createSelector(
  selectUserState,
  (userState) => userState.oauth2LoginSuccess,
);

export const selectOauth2LoginError = createSelector(
  selectUserState,
  (userState) => userState.oauth2LoginError,
);


