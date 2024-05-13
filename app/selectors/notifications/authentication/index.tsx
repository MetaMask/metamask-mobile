/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../../reducers';

const selectAuthenticationControllerState = (state: RootState) =>
  state.engine.backgroundState.AuthenticationController;

export const selectIsSignedIn = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState) => authenticationControllerState.isSignedIn,
);

export const selectParticipateInMetaMetrics = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState) =>
    authenticationControllerState.participateInMetaMetrics,
);
