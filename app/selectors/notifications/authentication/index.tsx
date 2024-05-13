/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../../reducers';

const selectNotificationsControllerState = (state: RootState) =>
  state.engine.backgroundState.NotificationsController;

export const selectIsSignedIn = createSelector(
  selectNotificationsControllerState,
  (notificationsControllerState) => notificationsControllerState.isSignedIn,
);

export const selectParticipateInMetaMetrics = createSelector(
  selectNotificationsControllerState,
  (notificationsControllerState) =>
    notificationsControllerState.participateInMetaMetrics,
);
