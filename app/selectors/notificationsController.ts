import { createSelector } from 'reselect';
import { RootState } from '../reducers';

export const selectNotificationState = (state: RootState) => state.notification;

export const selectNotificationsSettings = createSelector(
  selectNotificationState,
  (notificationsSettings) => notificationsSettings,
);

export const selectNotificationsStatus = createSelector(
  selectNotificationsSettings,
  (isEnabled) => isEnabled,
);
