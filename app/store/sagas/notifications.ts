import { call, put, takeLatest, all } from 'redux-saga/effects';
import {
  NotificationServicesController,
  NotificationServicesPushController,
} from '@metamask/notification-services-controller';
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import { NOTIFICATIONS_ERRORS } from './constants';
import {
  checkAccountsPresenceFailure,
  checkAccountsPresenceSuccess,
  disableNotificationsServicesSuccess,
  disableNotificationsServicesFailure,
  disableProfileSyncingFailure,
  disableProfileSyncingSuccess,
  disablePushNotificationsFailure,
  disablePushNotificationsSuccess,
  enableNotificationsServicesSuccess,
  enableNotificationsServicesFailure,
  enableProfileSyncingFailure,
  enableProfileSyncingSuccess,
  enablePushNotificationsFailure,
  enablePushNotificationsSuccess,
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
  // setSnapNotificationsEnabledFailure,
  // setSnapNotificationsEnabledSuccess,
  updateOnChainTriggersByAccountSuccess,
  updateOnChainTriggersByAccountFailure,
  deleteOnChainTriggersByAccountSuccess,
  deleteOnChainTriggersByAccountFailure,
  updateTriggerPushNotificationsFailure,
  updateTriggerPushNotificationsSuccess,
} from '../../actions/notification/pushNotifications';
import notificationsAction from '../../actions/notification/helpers/constants';

function* signIn() {
  try {
    const { accessToken } = yield call(
      AuthenticationController.performSignIn(),
    );
    if (!accessToken) {
      yield put(performSignInFailure(NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_IN));
      return;
    }

    yield put(performSignInSuccess(accessToken));
  } catch (error: any) {
    yield put(performSignInFailure(error));
  }
}

function* signOut() {
  try {
    const { result } = yield call(AuthenticationController.performSignOut());
    if (!result.ok) {
      yield put(performSignOutFailure(NOTIFICATIONS_ERRORS.FAILED_TO_SIGN_OUT));
      return;
    }
    yield put(performSignOutSuccess());
  } catch (error: any) {
    yield put(performSignOutFailure(error));
  }
}

function* enableProfileSyncing() {
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
  } catch (error: any) {
    yield put(enableProfileSyncingFailure(error));
  }
}

function* disableProfileSyncing() {
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
  } catch (error: any) {
    yield put(disableProfileSyncingFailure(error));
  }
}

function* enableNotificationServices() {
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
    // yield put(setSnapNotificationsEnabledSuccess());
    yield put(enablePushNotificationsSuccess());
  } catch (error: any) {
    yield put(enableNotificationsServicesFailure(error));
  }
}

function* disableNotificationServices() {
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
  } catch (error: any) {
    yield put(disableNotificationsServicesFailure(error));
  }
}

function* setFeatureAnnouncementsEnabled() {
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
  } catch (error: any) {
    yield put(setFeatureAnnouncementsEnabledFailure(error));
  }
}
//TODO: Method not implemented in current version of NotificationServicesController
// function* setSnapNotificationsEnabled() {
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
//   } catch (error: any) {
//     yield put(setSnapNotificationsEnabledFailure(error));
//   }
// }

function* checkAccountsPresence(action: any) {
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
  } catch (error: any) {
    yield put(checkAccountsPresenceFailure(error));
  }
}

function* setMetamaskNotificationsFeatureSeen() {
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
  } catch (error: any) {
    yield put(setMetamaskNotificationsFeatureSeenFailure(error));
  }
}

function* fetchAndUpdateMetamaskNotifications() {
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
  } catch (error: any) {
    yield put(fetchAndUpdateMetamaskNotificationsFailure(error));
  }
}

function* markMetamaskNotificationsAsRead(action: any) {
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
    yield put(markMetamaskNotificationsAsReadSuccess());
  } catch (error: any) {
    yield put(markMetamaskNotificationsAsReadFailure(error));
  }
}

function* updateOnChainTriggersByAccount(action: any) {
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
  } catch (error: any) {
    yield put(updateOnChainTriggersByAccountFailure(error));
  }
}

function* deleteOnChainTriggersByAccount(action: any) {
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
  } catch (error: any) {
    yield put(deleteOnChainTriggersByAccountFailure(error));
  }
}

function* enablePushNotifications(action: any) {
  const { UUIDs } = action.payload;
  try {
    const { result } = yield call(
      NotificationServicesPushController.enablePushNotifications(UUIDs),
    );
    if (!result.ok) {
      yield put(
        enablePushNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_ENABLE_PUSH_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(enablePushNotificationsSuccess());
  } catch (error: any) {
    yield put(enablePushNotificationsFailure(error));
  }
}

function* disablePushNotifications(action: any) {
  const { UUIDs } = action.payload;

  try {
    const { result } = yield call(
      NotificationServicesPushController.disablePushNotifications(UUIDs),
    );
    if (!result.ok) {
      yield put(
        disablePushNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_DISABLE_PUSH_NOTIFICATIONS,
        ),
      );
      return;
    }
    yield put(disablePushNotificationsSuccess());
  } catch (error: any) {
    yield put(disablePushNotificationsFailure(error));
  }
}

function* updateTriggerPushNotifications(action: any) {
  const { UUIDs } = action.payload;

  try {
    const { result } = yield call(
      NotificationServicesPushController.updateTriggerPushNotifications(UUIDs),
    );
    if (!result.ok) {
      yield put(
        updateTriggerPushNotificationsFailure(
          NOTIFICATIONS_ERRORS.FAILED_TO_UPDATE_PUSH_NOTIFICATIONS_TRIGGERS,
        ),
      );
      return;
    }
    yield put(updateTriggerPushNotificationsSuccess(result));
  } catch (error: any) {
    yield put(updateTriggerPushNotificationsFailure(error));
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
    notificationsAction.ENABLE_PUSH_NOTIFICATIONS_REQUEST,
    enableNotificationServices,
  ),
  takeLatest(
    notificationsAction.DISABLE_PUSH_NOTIFICATIONS_REQUEST,
    disableNotificationServices,
  ),
  takeLatest(
    notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST,
    setFeatureAnnouncementsEnabled,
  ),
  // takeLatest(
  //   notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST,
  //   setSnapNotificationsEnabled,
  // ),
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

  takeLatest(
    notificationsAction.ENABLE_PUSH_NOTIFICATIONS_REQUEST,
    enablePushNotifications,
  ),

  takeLatest(
    notificationsAction.DISABLE_PUSH_NOTIFICATIONS_REQUEST,
    disablePushNotifications,
  ),
  takeLatest(
    notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_REQUEST,
    updateTriggerPushNotifications,
  ),
]);
