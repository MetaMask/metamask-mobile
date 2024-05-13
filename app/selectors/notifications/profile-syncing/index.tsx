/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../../reducers';

const selectNotificationsControllerState = (state: RootState) =>
  state.engine.backgroundState.NotificationsController;

export const selectIsProfileSyncingEnabled = createSelector(
  selectNotificationsControllerState,
  (notificationsControllerState) =>
    notificationsControllerState.isProfileSyncingEnabled,
);
