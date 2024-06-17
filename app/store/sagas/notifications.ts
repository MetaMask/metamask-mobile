import { put, call } from 'redux-saga/effects';
import { NOTIFICATIONS_ERRORS } from './constants';
import NotificationsActions from '../ducks/notifications';

import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import { NotificationServicesController } from '@metamask/notification-services-controller';

export function* signIn() {
  try {
    const { accessToken, expiresIn } = yield call(
      AuthenticationController.performSignIn(),
    );
    if (!accessToken) {
      yield put(
        NotificationsActions.performSignInFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_IN,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.performSignInSuccess({ accessToken, expiresIn }),
    );
  } catch (error) {
    yield put(NotificationsActions.performSignInFailure({ error }));
  }
}

export function* signOut() {
  try {
    const { result } = yield call(AuthenticationController.performSignOut());
    if (!result.ok) {
      yield put(
        NotificationsActions.performSignOutFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_OUT,
        ),
      );
      return;
    }
    yield put(NotificationsActions.performSignOutSuccess());
  } catch (error) {
    yield put(NotificationsActions.performSignOutFailure({ error }));
  }
}

export function* enableProfileSyncing() {
  try {
    const { result } = yield call(UserStorageController.enableProfileSyncing());
    if (!result.ok) {
      yield put(
        NotificationsActions.enableProfileSyncingFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(NotificationsActions.enableProfileSyncingSuccess());
  } catch (error) {
    yield put(NotificationsActions.enableProfileSyncingFailure({ error }));
  }
}

export function* disableProfileSyncing() {
  try {
    const { result } = yield call(
      UserStorageController.disableProfileSyncing(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.disableProfileSyncingFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(NotificationsActions.disableProfileSyncingSuccess());
  } catch (error) {
    yield put(NotificationsActions.disableProfileSyncingFailure({ error }));
  }
}

export function* enableMetamaskNotifications() {
  try {
    const { result } = yield call(
      NotificationServicesController.enableMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.enablePushNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.enablePushNotificationsSuccess());
    yield put(NotificationsActions.setFeatureAnnouncementsEnabledSuccess());
    yield put(NotificationsActions.setSnapNotificationsEnabledSuccess());
  } catch (error) {
    yield put(
      NotificationsActions.enablePushNotificationsFailure({ error }),
    );
  }
}

export function* disableMetamaskNotifications() {
  try {
    const { result } = yield call(
      NotificationServicesController.disableMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.disablePushNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.disablePushNotificationsSuccess());
  } catch (error) {
    yield put(
      NotificationsActions.disablePushNotificationsFailure({ error }),
    );
  }
}

export function* setFeatureAnnouncementsEnabled() {
  try {
    const { result } = yield call(
      NotificationServicesController.setFeatureAnnouncementsEnabled(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.setFeatureAnnouncementsEnabledFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_FEATURE_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.setFeatureAnnouncementsEnabledSuccess());
  } catch (error) {
    yield put(
      NotificationsActions.setFeatureAnnouncementsEnabledFailure({ error }),
    );
  }
}

export function* setSnapNotificationsEnabled() {
  try {
    const { result } = yield call(
      NotificationServicesController.setSnapNotificationsEnabled(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.setSnapNotificationsEnabledFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_SNAP_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.setSnapNotificationsEnabledSuccess());
  } catch (error) {
    yield put(
      NotificationsActions.setSnapNotificationsEnabledFailure({ error }),
    );
  }
}

export function* setParticipateInMetaMetrics() {
  try {
    const { result } = yield call(
      MetaMetricsController.setParticipateInMetaMetrics(),
    );

    if (!result.ok) {
      yield put(
        NotificationsActions.setParticipateInMetaMetricsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PARTICIPATE_IN_META_METRICS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.setParticipateInMetaMetricsSuccess());
  } catch (error) {
    yield put(
      NotificationsActions.setParticipateInMetaMetricsFailure({ error }),
    );
  }
}

export function* checkAccountsPresence(action: any) {
  const { accounts } = action.payload;
  try {
    const { presence } = yield call(
      NotificationServicesController.checkAccountsPresence(accounts),
    );
    if (!presence) {
      yield put(
        NotificationsActions.checkAccountsPresenceFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_CHECK_ACCOUNTS_PRESENCE,
        ),
      );
      return;
    }
    yield put(NotificationsActions.checkAccountsPresenceSuccess({ presence }));
  } catch (error) {
    yield put(NotificationsActions.checkAccountsPresenceFailure({ error }));
  }
}

export function* setMetamaskNotificationsFeatureSeen() {
  try {
    const { result } = yield call(
      NotificationServicesController.setMetamaskNotificationsFeatureSeen(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.setMetamaskNotificationsFeatureSeenFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_SET_NOTIFICATIONS_FEATURE_SEEN,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.setMetamaskNotificationsFeatureSeenSuccess(),
    );
  } catch (error) {
    yield put(
      NotificationsActions.setMetamaskNotificationsFeatureSeenFailure({
        error,
      }),
    );
  }
}

export function* fetchAndUpdateMetamaskNotifications() {
  try {
    const { result } = yield call(
      NotificationServicesController.fetchAndUpdateMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.fetchAndUpdateMetamaskNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_FETCH_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.fetchAndUpdateMetamaskNotificationsSuccess({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
        metamaskNotificationsReadList:
          result.data.metamaskNotificationsReadList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.fetchAndUpdateMetamaskNotificationsFailure({
        error,
      }),
    );
  }
}

export function* markMetamaskNotificationsAsRead(action: any) {
  const { notifications } = action.payload;
  try {
    const { result } = yield call(
      NotificationServicesController.markMetamaskNotificationsAsRead(
        notifications,
      ),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.markMetamaskNotificationsAsReadFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_MARK_AS_READ_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.markMetamaskNotificationsAsReadSuccess({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
        metamaskNotificationsReadList:
          result.data.metamaskNotificationsReadList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.markMetamaskNotificationsAsReadFailure({
        error,
      }),
    );
  }
}

export function* deleteNotifications(action: any) {
  const { notifications } = action.payload;
  try {
    const { result } = yield call(
      NotificationServicesController.deleteNotifications(notifications),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.deleteNotificationStatusFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DELETE_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.deleteNotificationStatusSuccess({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.deleteNotificationStatusFailure({
        error,
      }),
    );
  }
}
