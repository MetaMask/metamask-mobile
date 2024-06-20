import { call, put, takeLatest, all } from 'redux-saga/effects';
import Engine from '../../core/Engine';
import { NOTIFICATIONS_ERRORS } from './constants';
import {
  checkAccountsPresenceFailure,
  checkAccountsPresenceSuccess,
  disableNotificationsServicesSuccess,
  disableNotificationsServicesFailure,
  disableProfileSyncingFailure,
  disableProfileSyncingSuccess,
  enableNotificationsServicesSuccess,
  enableNotificationsServicesFailure,
  enableProfileSyncingFailure,
  enableProfileSyncingSuccess,
  fetchAndUpdateMetamaskNotificationsFailure,
  fetchAndUpdateMetamaskNotificationsSuccess,
  markMetamaskNotificationsAsReadFailure,
  markMetamaskNotificationsAsReadSuccess,
  performSignInFailure,
  performSignInSuccess,
  performSignOutFailure,
  performSignOutSuccess,
  setFeatureAnnouncementsEnabledFailure,
  setFeatureAnnouncementsEnabledSuccess,
  setMetamaskNotificationsFeatureSeenFailure,
  setMetamaskNotificationsFeatureSeenSuccess,
  updateOnChainTriggersByAccountSuccess,
  updateOnChainTriggersByAccountFailure,
  deleteOnChainTriggersByAccountSuccess,
  deleteOnChainTriggersByAccountFailure,
} from '../../actions/notification/pushNotifications';
import notificationsAction from '../../actions/notification/helpers/constants';
import { getErrorMessage } from '../../util/errorHandling';

const {
  AuthenticationController,
  UserStorageController,
  NotificationServicesController,
}: any = Engine.context;

export function* signIn() {
  try {
    const { accessToken } = yield call(
      AuthenticationController.performSignIn(),
    );
    if (!accessToken) {
      yield put(performSignInFailure(NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_IN));
      return;
    }

    yield put(performSignInSuccess(accessToken));
  } catch (error) {
    yield put(performSignInFailure(getErrorMessage(error)));
  }
}

export function* signOut() {
  try {
    const { result } = yield call(AuthenticationController.performSignOut());
    if (!result.ok) {
      yield put(performSignOutFailure(NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_OUT));
      return;
    }
    yield put(performSignOutSuccess());
  } catch (error) {
    yield put(performSignOutFailure(getErrorMessage(error)));
  }
}

export function* enableProfileSyncing() {
  try {
    const { result } = yield call(UserStorageController.enableProfileSyncing());
    if (!result.ok) {
      yield put(
        enableProfileSyncingFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(enableProfileSyncingSuccess());
  } catch (error) {
    yield put(enableProfileSyncingFailure(getErrorMessage(error)));
  }
}

export function* disableProfileSyncing() {
  try {
    const { result } = yield call(
      UserStorageController.disableProfileSyncing(),
    );
    if (!result.ok) {
      yield put(
        disableProfileSyncingFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_PROFILE_SYNCING,
        ),
      );
      return;
    }
    yield put(disableProfileSyncingSuccess());
  } catch (error) {
    yield put(disableProfileSyncingFailure(getErrorMessage(error)));
  }
}

export function* enableNotificationServices() {
  try {
    const { result } = yield call(
      NotificationServicesController.enableNotificationServices(),
    );
    if (!result.ok) {
      yield put(
        enableNotificationsServicesFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(enableNotificationsServicesSuccess());
    yield put(setFeatureAnnouncementsEnabledSuccess());
  } catch (error) {
    yield put(enableNotificationsServicesFailure(getErrorMessage(error)));
  }
}

export function* disableNotificationServices() {
  try {
    const { result } = yield call(
      NotificationServicesController.disableNotificationServices(),
    );
    if (!result.ok) {
      yield put(
        disableNotificationsServicesFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_METAMASK_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(disableNotificationsServicesSuccess());
  } catch (error) {
    yield put(disableNotificationsServicesFailure(getErrorMessage(error)));
  }
}

export function* setFeatureAnnouncementsEnabled() {
  try {
    const { result } = yield call(
      NotificationServicesController.setFeatureAnnouncementsEnabled(),
    );
    if (!result.ok) {
      yield put(
        setFeatureAnnouncementsEnabledFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_FEATURE_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(setFeatureAnnouncementsEnabledSuccess());
  } catch (error) {
    yield put(setFeatureAnnouncementsEnabledFailure(getErrorMessage(error)));
  }
}
//TODO: Method not implemented in current version of NotificationServicesController
// export function* setSnapNotificationsEnabled() {
//   try {
//     const { result } = yield call(
//       NotificationServicesController.setSnapNotificationsEnabled(),
//     );
//     if (!result.ok) {
//       yield put(
//         setSnapNotificationsEnabledFailure(
//           NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_SNAP_NOTIFICATIONS,
//         ),
//       );
//       return;
//     }
//     yield put(setSnapNotificationsEnabledSuccess());
//   } catch (error) {
//     yield put(setSnapNotificationsEnabledFailure(getErrorMessage(error)));
//   }
// }

export function* checkAccountsPresence(action: any) {
  const { accounts } = action.payload;
  try {
    const { presence } = yield call(
      NotificationServicesController.checkAccountsPresence(accounts),
    );
    if (!presence) {
      yield put(
        checkAccountsPresenceFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_CHECK_ACCOUNTS_PRESENCE,
        ),
      );
      return;
    }
    yield put(checkAccountsPresenceSuccess(presence));
  } catch (error) {
    yield put(checkAccountsPresenceFailure(getErrorMessage(error)));
  }
}

export function* setMetamaskNotificationsFeatureSeen() {
  try {
    const { result } = yield call(
      NotificationServicesController.setMetamaskNotificationsFeatureSeen(),
    );
    if (!result.ok) {
      yield put(
        setMetamaskNotificationsFeatureSeenFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_SET_NOTIFICATIONS_FEATURE_SEEN,
        ),
      );
      return;
    }
    yield put(setMetamaskNotificationsFeatureSeenSuccess());
  } catch (error) {
    yield put(
      setMetamaskNotificationsFeatureSeenFailure(getErrorMessage(error)),
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
        fetchAndUpdateMetamaskNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_FETCH_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(fetchAndUpdateMetamaskNotificationsSuccess(result.data));
  } catch (error) {
    yield put(
      fetchAndUpdateMetamaskNotificationsFailure(getErrorMessage(error)),
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
        markMetamaskNotificationsAsReadFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_MARK_AS_READ_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(markMetamaskNotificationsAsReadSuccess(result));
  } catch (error) {
    yield put(markMetamaskNotificationsAsReadFailure(getErrorMessage(error)));
  }
}

export function* updateOnChainTriggersByAccount(action: any) {
  const { accounts } = action.payload;
  try {
    const { result } = yield call(
      NotificationServicesController.updateOnChainTriggersByAccount(accounts),
    );
    if (!result.ok) {
      yield put(
        updateOnChainTriggersByAccountFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_UPDATE_ON_CHAIN_TRIGGERS,
        ),
      );
      return;
    }
    yield put(updateOnChainTriggersByAccountSuccess());
  } catch (error) {
    yield put(updateOnChainTriggersByAccountFailure(getErrorMessage(error)));
  }
}

export function* deleteOnChainTriggersByAccount(action: any) {
  const { account } = action.payload;
  try {
    const { result } = yield call(
      NotificationServicesController.deleteOnChainTriggersByAccount(account),
    );
    if (!result.ok) {
      yield put(
        deleteOnChainTriggersByAccountFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DELETE_ON_CHAIN_TRIGGERS,
        ),
      );
      return;
    }
    yield put(deleteOnChainTriggersByAccountSuccess());
  } catch (error) {
    yield put(deleteOnChainTriggersByAccountFailure(getErrorMessage(error)));
  }
}

export default all([
  takeLatest(notificationsAction.PERFORM_SIGN_IN_REQUEST, signIn),
  takeLatest(notificationsAction.PERFORM_SIGN_OUT_REQUEST, signOut),
  takeLatest(
    notificationsAction.ENABLE_PROFILE_SYNCING_REQUEST,
    enableProfileSyncing,
  ),
  takeLatest(
    notificationsAction.DISABLE_PROFILE_SYNCING_REQUEST,
    disableProfileSyncing,
  ),
  takeLatest(
    notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_REQUEST,
    enableNotificationServices,
  ),
  takeLatest(
    notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_REQUEST,
    disableNotificationServices,
  ),
  takeLatest(
    notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST,
    setFeatureAnnouncementsEnabled,
  ),
  takeLatest(
    notificationsAction.CHECK_ACCOUNTS_PRESENCE_REQUEST,
    checkAccountsPresence,
  ),
  takeLatest(
    notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST,
    setMetamaskNotificationsFeatureSeen,
  ),
  takeLatest(
    notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST,
    fetchAndUpdateMetamaskNotifications,
  ),
  takeLatest(
    notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST,
    markMetamaskNotificationsAsRead,
  ),

  takeLatest(
    notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    updateOnChainTriggersByAccount,
  ),

  takeLatest(
    notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    deleteOnChainTriggersByAccount,
  ),
]);
