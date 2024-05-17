import { put, call } from 'redux-saga/effects';
import { NOTIFICATIONS_ERRORS } from './constants';
import NotificationsActions from '../ducks/notifications';

export function* signIn() {
  try {
    const { accessToken, expiresIn } = yield call(
      AuthenticationController.performSignIn(),
    );
    if (!accessToken) {
      yield put(
        NotificationsActions.failurePerformSignIn(
          NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_IN,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.successPerformSignIn({ accessToken, expiresIn }),
    );
  } catch (error) {
    yield put(NotificationsActions.failurePerformSignIn({ error }));
  }
}

export function* signOut() {
  try {
    const { result } = yield call(AuthenticationController.performSignOut());
    if (!result.ok) {
      yield put(
        NotificationsActions.failurePerformSignOut(
          NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_OUT,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successPerformSignOut());
  } catch (error) {
    yield put(NotificationsActions.failurePerformSignOut({ error }));
  }
}

export function* enableProfileSyncing() {
  try {
    const { result } = yield call(UserStorageController.enableProfileSyncing());
    if (!result.ok) {
      yield put(
        NotificationsActions.failureEnableProfileSyncing(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successEnableProfileSyncing());
  } catch (error) {
    yield put(NotificationsActions.failureEnableProfileSyncing({ error }));
  }
}

export function* disableProfileSyncing() {
  try {
    const { result } = yield call(
      UserStorageController.disableProfileSyncing(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureDisableProfileSyncing(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successDisableProfileSyncing());
  } catch (error) {
    yield put(NotificationsActions.failureDisableProfileSyncing({ error }));
  }
}

export function* enableMetamaskNotifications() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.enableMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureEnableMetamaskNotifications(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successEnableMetamaskNotifications());
    yield put(NotificationsActions.successSetFeatureAnnouncementsEnabled());
    yield put(NotificationsActions.successSetSnapNotificationsEnabled());
  } catch (error) {
    yield put(
      NotificationsActions.failureEnableMetamaskNotifications({ error }),
    );
  }
}

export function* disableMetamaskNotifications() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.disableMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureDisableMetamaskNotifications(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successDisableMetamaskNotifications());
  } catch (error) {
    yield put(
      NotificationsActions.failureDisableMetamaskNotifications({ error }),
    );
  }
}

export function* setFeatureAnnouncementsEnabled() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.setFeatureAnnouncementsEnabled(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureSetFeatureAnnouncementsEnabled(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_FEATURE_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successSetFeatureAnnouncementsEnabled());
  } catch (error) {
    yield put(
      NotificationsActions.failureSetFeatureAnnouncementsEnabled({ error }),
    );
  }
}

export function* setSnapNotificationsEnabled() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.setSnapNotificationsEnabled(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureSetSnapNotificationsEnabled(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_SNAP_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successSetSnapNotificationsEnabled());
  } catch (error) {
    yield put(
      NotificationsActions.failureSetSnapNotificationsEnabled({ error }),
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
        NotificationsActions.failureSetParticipateInMetaMetrics(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PARTICIPATE_IN_META_METRICS,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successSetParticipateInMetaMetrics());
  } catch (error) {
    yield put(
      NotificationsActions.failureSetParticipateInMetaMetrics({ error }),
    );
  }
}

export function* checkAccountsPresence(action: any) {
  const { accounts } = action.payload;
  try {
    const { presence } = yield call(
      MetamaskNotificationsController.checkAccountsPresence(accounts),
    );
    if (!presence) {
      yield put(
        NotificationsActions.failureCheckAccountsPresence(
          NOTIFICATIONS_ERRORS.FAILED_TO_CHECK_ACCOUNTS_PRESENCE,
        ),
      );
      return;
    }
    yield put(NotificationsActions.successCheckAccountsPresence({ presence }));
  } catch (error) {
    yield put(NotificationsActions.failureCheckAccountsPresence({ error }));
  }
}

export function* setMetamaskNotificationsFeatureSeen() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.setMetamaskNotificationsFeatureSeen(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureSetMetamaskNotificationsFeatureSeen(
          NOTIFICATIONS_ERRORS.FAILED_TO_SET_NOTIFICATIONS_FEATURE_SEEN,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.successSetMetamaskNotificationsFeatureSeen(),
    );
  } catch (error) {
    yield put(
      NotificationsActions.failureSetMetamaskNotificationsFeatureSeen({
        error,
      }),
    );
  }
}

export function* fetchAndUpdateMetamaskNotifications() {
  try {
    const { result } = yield call(
      MetamaskNotificationsController.fetchAndUpdateMetamaskNotifications(),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureFetchAndUpdateMetamaskNotifications(
          NOTIFICATIONS_ERRORS.FAILED_TO_FETCH_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.successFetchAndUpdateMetamaskNotifications({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
        metamaskNotificationsReadList:
          result.data.metamaskNotificationsReadList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.failureFetchAndUpdateMetamaskNotifications({
        error,
      }),
    );
  }
}

export function* markMetamaskNotificationsAsRead(action: any) {
  const { notifications } = action.payload;
  try {
    const { result } = yield call(
      MetamaskNotificationsController.markMetamaskNotificationsAsRead(
        notifications,
      ),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureMarkMetamaskNotificationsAsRead(
          NOTIFICATIONS_ERRORS.FAILED_TO_MARK_AS_READ_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.successMarkMetamaskNotificationsAsRead({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
        metamaskNotificationsReadList:
          result.data.metamaskNotificationsReadList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.failureMarkMetamaskNotificationsAsRead({
        error,
      }),
    );
  }
}

export function* deleteNotifications(action: any) {
  const { notifications } = action.payload;
  try {
    const { result } = yield call(
      MetamaskNotificationsController.deleteNotifications(notifications),
    );
    if (!result.ok) {
      yield put(
        NotificationsActions.failureDeleteNotificationsStatus(
          NOTIFICATIONS_ERRORS.FAILED_TO_DELETE_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(
      NotificationsActions.successDeleteNotificationsStatus({
        metamaskNotificationsList: result.data.metamaskNotificationsList,
      }),
    );
  } catch (error) {
    yield put(
      NotificationsActions.failureDeleteNotificationsStatus({
        error,
      }),
    );
  }
}
