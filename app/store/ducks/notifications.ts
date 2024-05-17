/** THE TYPES BELLOW ARE FOR THE NEW METAMASK NOTIFICATIONS FEATURE
 * WE ARE USING THE DUCK PATTERN WITH REDUX SAUCE FOR NEW NOTIFICATIONS
 */
import { createActions, createReducer } from 'reduxsauce';

import { Notification } from '../../util/notifications';

export const { Types, Creators } = createActions({
  // handle loading for any action
  showLoadingIndication: [],
  hideLoadingIndication: [],
  // handle sign in/out
  performSignInRequest: [],
  performSignInSuccess: ['accessToken'],
  performSignInFailure: ['error'],
  performSignOutRequest: [],
  performSignOutSuccess: [],
  performSignOutFailure: ['error'],
  // handle turning on/off profile syncing
  enableProfileSyncingRequest: [],
  enableProfileSyncingSuccess: [],
  enableProfileSyncingFailure: ['error'],
  disableProfileSyncingRequest: [],
  disableProfileSyncingSuccess: [],
  disableProfileSyncingFailure: ['error'],
  // handle turning on/off metamask notifications
  enableMetamaskNotificationsRequest: [],
  enableMetamaskNotificationsSuccess: [],
  enableMetamaskNotificationsFailure: ['error'],
  disableMetamaskNotificationsRequest: [],
  disableMetamaskNotificationsSuccess: [],
  disableMetamaskNotificationsFailure: ['error'],
  // handle checking accounts presence
  checkAccountsPresenceRequest: ['accounts'],
  checkAccountsPresenceSuccess: [],
  checkAccountsPresenceFailure: ['error'],
  // handle on chain triggers
  createOnChainTriggersRequest: [],
  createOnChainTriggersSuccess: [],
  createOnChainTriggersFailure: ['error'],
  updateOnChainTriggersByAccountRequest: [],
  updateOnChainTriggersByAccountSuccess: [],
  updateOnChainTriggersByAccountFailure: ['error'],
  deleteOnChainTriggersByAccountRequest: [],
  deleteOnChainTriggersByAccountSuccess: [],
  deleteOnChainTriggersByAccountFailure: ['error'],
  // handle turning on/off individuals notifications types
  setFeatureAnnouncementsEnabledRequest: [],
  setFeatureAnnouncementsEnabledSuccess: [],
  setFeatureAnnouncementsEnabledFailure: ['error'],
  setSnapNotificationsEnabledRequest: [],
  setSnapNotificationsEnabledSuccess: [],
  setSnapNotificationsEnabledFailure: ['error'],
  setParticipateInMetaMetricsRequest: [],
  setParticipateInMetaMetricsSuccess: [],
  setParticipateInMetaMetricsFailure: ['error'],
  // handle if users have seen the notification feature annoucement/card
  setMetamaskNotificationsFeatureSeenRequest: [],
  setMetamaskNotificationsFeatureSeenSuccess: [],
  setMetamaskNotificationsFeatureSeenFailure: ['error'],
  // handle notifications actions like fetching, marking as read and deleting
  fetchAndUpdateMetamaskNotificationsRequest: [],
  fetchAndUpdateMetamaskNotificationsSuccess: [],
  fetchAndUpdateMetamaskNotificationsFailure: ['error'],
  markMetamaskNotificationsAsReadRequest: [],
  markMetamaskNotificationsAsReadSuccess: [],
  markMetamaskNotificationsAsReadFailure: ['error'],
  deleteNotificationStatusRequest: [],
  deleteNotificationStatusSuccess: [],
  deleteNotificationStatusFailure: ['error'],
});

export const NotificationsTypes = Types;
export default Creators;

interface IsEnabled {
  loading: boolean;
  error: any;
  status: boolean;
}

interface Profile {
  identifierId: string;
  profileId: string;
  metametricsId: string;
}

interface SessionData {
  profile: Profile;
  accessToken: string;
  expiresIn: string;
}
interface PushNotificationsState {
  pushNotifications: {
    isSignedIn: IsEnabled;
    isProfileSyncingEnabled: IsEnabled;
    isParticipatingInMetaMetrics: IsEnabled;
    isMetamaskNotificationsEnabled: IsEnabled;
    isSnapNotificationsEnabled: IsEnabled;
    isFeatureAnnouncementsEnabled: IsEnabled;
    isCheckingAccountsPresence: IsEnabled;
    isUpdatingMetamaskNotifications: IsEnabled;
    hasSeenNotificationsFeature: IsEnabled;
    isFetchingMetamaskNotification: IsEnabled;
    isUpdatingMetamaskNotificationsAccounts: IsEnabled;
    metamaskNotificationsList: Notification[];
    metamaskNotificationsReadList: Notification[];
    sessionData: SessionData;
    internalAccounts: any[];
    uniqueAccounts: any[];
    isUpdatingMetamaskNotificationsAccount: any[];
  };
}

const initialState = {
  pushNotifications: {
    isSignedIn: {
      loading: false,
      error: null,
      status: false,
    },
    isProfileSyncingEnabled: {
      loading: false,
      error: null,
      status: true,
    },
    isParticipatingInMetaMetrics: {
      loading: false,
      error: null,
      status: false,
    },
    isMetamaskNotificationsEnabled: {
      loading: false,
      error: null,
      status: false,
    },
    isSnapNotificationsEnabled: {
      loading: false,
      error: null,
      status: false,
    },
    isFeatureAnnouncementsEnabled: {
      loading: false,
      error: null,
      status: false,
    },
    isCheckingAccountsPresence: {
      loading: false,
      error: null,
      status: false,
    },
    isUpdatingMetamaskNotifications: {
      loading: false,
      error: null,
      status: false,
    },
    hasSeenNotificationsFeature: {
      loading: false,
      error: null,
      status: false,
    },
    isFetchingMetamaskNotification: {
      loading: false,
      error: null,
      status: false,
    },
    isUpdatingMetamaskNotificationsAccounts: {
      loading: false,
      error: null,
      status: false,
    },
    metamaskNotificationsList: [],
    metamaskNotificationsReadList: [],
    sessionData: {
      profile: {
        identifierId: '',
        profileId: '',
        metametricsId: '',
      },
      accessToken: '',
      expiresIn: '',
    },
    internalAccounts: [],
    uniqueAccounts: [],
    isUpdatingMetamaskNotificationsAccount: [],
  },
} as PushNotificationsState;

const requestPerformSignIn = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successPerformSignIn = (
  state: PushNotificationsState,
  {
    accessToken,
    expiresIn,
  }: {
    accessToken: string;
    expiresIn: string;
  },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: false,
      error: null,
      status: true,
    },
    sessionData: {
      ...state.pushNotifications.sessionData,
      accessToken,
      expiresIn,
    },
  },
});
const failurePerformSignIn = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestPerformSignOut = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const successPerformSignOut = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: false,
      error: null,
      status: false,
    },
    sessionData: {
      profile: {},
      accessToken: '',
      expiresIn: '',
    },
  },
});
const failurePerformSignOut = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: false,
      error,
      status: true,
    },
  },
});

const requestEnableProfileSyncing = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successEnableProfileSyncing = (
  state: PushNotificationsState,
  { identifierId, profileId, metametricsId }: Profile,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: false,
      error: null,
      status: true,
    },
    sessionData: {
      ...state.pushNotifications.sessionData,
      profile: {
        identifierId,
        profileId,
        metametricsId,
      },
    },
  },
});
const failureEnableProfileSyncing = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestDisableProfileSyncing = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const successDisableProfileSyncing = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: false,
      error: null,
      status: false,
    },
  },
});
const failureDisableProfileSyncing = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: false,
      error,
      status: true,
    },
  },
});

const requestEnableMetamaskNotifications = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successEnableMetamaskNotifications = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureEnableMetamaskNotifications = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestDisableMetamaskNotifications = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const successDisableMetamaskNotifications = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: false,
      error: null,
      status: false,
    },
  },
});
const failureDisableMetamaskNotifications = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isMetamaskNotificationsEnabled: {
      loading: false,
      error,
      status: true,
    },
  },
});

const requestSetFeatureAnnouncementsEnabled = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFeatureAnnouncementsEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successSetFeatureAnnouncementsEnabled = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFeatureAnnouncementsEnabled: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureSetFeatureAnnouncementsEnabled = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFeatureAnnouncementsEnabled: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestSetSnapNotificationsEnabled = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSnapNotificationsEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successSetSnapNotificationsEnabled = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSnapNotificationsEnabled: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureSetSnapNotificationsEnabled = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSnapNotificationsEnabled: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestCheckAccountsPresence = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isCheckingAccountsPresence: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successCheckAccountsPresence = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isCheckingAccountsPresence: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureCheckAccountsPresence = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isCheckingAccountsPresence: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestSetParticipateInMetaMetrics = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isParticipatingInMetaMetrics: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successSetParticipateInMetaMetrics = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isParticipatingInMetaMetrics: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureSetParticipateInMetaMetrics = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isParticipatingInMetaMetrics: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestSetMetamaskNotificationsFeatureSeen = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    hasSeenNotificationsFeature: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const successSetMetamaskNotificationsFeatureSeen = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    hasSeenNotificationsFeature: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const failureSetMetamaskNotificationsFeatureSeen = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    hasSeenNotificationsFeature: {
      loading: false,
      error,
      status: false,
    },
  },
});

const requestUpdateOnChainTriggersByAccount = (
  state: PushNotificationsState,
  { accounts }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successUpdateOnChainTriggersByAccount = (
  state: PushNotificationsState,
  { accounts }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    uniqueAccounts: new Set([
      ...state.pushNotifications.isUpdatingMetamaskNotificationsAccount,
      ...accounts,
    ]),
  },
});
const failureUpdateOnChainTriggersByAccount = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

const requestFetchAndUpdateMetamaskNotifications = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successFetchAndUpdateMetamaskNotifications = (
  state: PushNotificationsState,
  {
    metamaskNotificationsList,
    metamaskNotificationsReadList,
  }: {
    metamaskNotificationsList: Notification[];
    metamaskNotificationsReadList: Notification[];
  },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    metamaskNotificationsList,
    metamaskNotificationsReadList,
  },
});
const failureFetchAndUpdateMetamaskNotifications = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

const requestMarkMetamaskNotificationsAsRead = (
  state: PushNotificationsState,
  { notifications }: { notifications: Notification[] },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successMarkMetamaskNotificationsAsRead = (
  state: PushNotificationsState,
  {
    metamaskNotificationsList,
    metamaskNotificationsReadList,
  }: {
    metamaskNotificationsList: Notification[];
    metamaskNotificationsReadList: Notification[];
  },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    metamaskNotificationsList,
    metamaskNotificationsReadList,
  },
});
const failureMarkMetamaskNotificationsAsRead = (
  state: PushNotificationsState,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

const requestDeleteNotificationStatus = (
  state: PushNotificationsState,
  { notifications }: { notifications: Notification[] },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successDeleteNotificationStatus = (
  state: PushNotificationsState,
  {
    metamaskNotificationsList,
  }: {
    metamaskNotificationsList: Notification[];
  },
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    metamaskNotificationsList,
  },
});
const failureDeleteNotificationStatus = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

// TODO: Work on these below
const requestCreateOnChainTriggers = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successCreateOnChainTriggers = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const failureCreateOnChainTriggers = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

const requestDeleteOnChainTriggers = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const successDeleteOnChainTriggers = (state: PushNotificationsState) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const failureDeleteOnChainTriggers = (
  state: PushNotificationsState,
  { error }: any,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});

export const pushNotificationsReducer = createReducer(initialState, {
  [Types.PERFORM_SIGN_IN_REQUEST]: requestPerformSignIn,
  [Types.PERFORM_SIGN_IN_SUCCESS]: successPerformSignIn,
  [Types.PERFORM_SIGN_IN_FAILURE]: failurePerformSignIn,
  [Types.PERFORM_SIGN_OUT_REQUEST]: requestPerformSignOut,
  [Types.PERFORM_SIGN_OUT_SUCCESS]: successPerformSignOut,
  [Types.PERFORM_SIGN_OUT_FAILURE]: failurePerformSignOut,
  [Types.ENABLE_PROFILE_SYNCING_REQUEST]: requestEnableProfileSyncing,
  [Types.ENABLE_PROFILE_SYNCING_SUCCESS]: successEnableProfileSyncing,
  [Types.ENABLE_PROFILE_SYNCING_FAILURE]: failureEnableProfileSyncing,
  [Types.DISABLE_PROFILE_SYNCING_REQUEST]: requestDisableProfileSyncing,
  [Types.DISABLE_PROFILE_SYNCING_SUCCESS]: successDisableProfileSyncing,
  [Types.DISABLE_PROFILE_SYNCING_FAILURE]: failureDisableProfileSyncing,
  [Types.ENABLE_METAMASK_NOTIFICATIONS_REQUEST]:
    requestEnableMetamaskNotifications,
  [Types.ENABLE_METAMASK_NOTIFICATIONS_SUCCESS]:
    successEnableMetamaskNotifications,
  [Types.ENABLE_METAMASK_NOTIFICATIONS_FAILURE]:
    failureEnableMetamaskNotifications,
  [Types.DISABLE_METAMASK_NOTIFICATIONS_REQUEST]:
    requestDisableMetamaskNotifications,
  [Types.DISABLE_METAMASK_NOTIFICATIONS_SUCCESS]:
    successDisableMetamaskNotifications,
  [Types.DISABLE_METAMASK_NOTIFICATIONS_FAILURE]:
    failureDisableMetamaskNotifications,
  [Types.CHECK_ACCOUNTS_PRESENCE_REQUEST]: requestCheckAccountsPresence,
  [Types.CHECK_ACCOUNTS_PRESENCE_SUCCESS]: successCheckAccountsPresence,
  [Types.CHECK_ACCOUNTS_PRESENCE_FAILURE]: failureCheckAccountsPresence,
  [Types.CREATE_ON_CHAIN_TRIGGERS_REQUEST]: requestCreateOnChainTriggers,
  [Types.CREATE_ON_CHAIN_TRIGGERS_SUCCESS]: successCreateOnChainTriggers,
  [Types.CREATE_ON_CHAIN_TRIGGERS_FAILURE]: failureCreateOnChainTriggers,
  [Types.DELETE_ON_CHAIN_TRIGGERS_REQUEST]: requestDeleteOnChainTriggers,
  [Types.DELETE_ON_CHAIN_TRIGGERS_SUCCESS]: successDeleteOnChainTriggers,
  [Types.DELETE_ON_CHAIN_TRIGGERS_FAILURE]: failureDeleteOnChainTriggers,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST]:
    requestUpdateOnChainTriggersByAccount,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS]:
    successUpdateOnChainTriggersByAccount,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE]:
    failureUpdateOnChainTriggersByAccount,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST]:
    requestSetFeatureAnnouncementsEnabled,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS]:
    successSetFeatureAnnouncementsEnabled,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE]:
    failureSetFeatureAnnouncementsEnabled,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST]:
    requestSetSnapNotificationsEnabled,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS]:
    successSetSnapNotificationsEnabled,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE]:
    failureSetSnapNotificationsEnabled,
  [Types.SET_PARTICIPATE_IN_META_METRICS_REQUEST]:
    requestSetParticipateInMetaMetrics,
  [Types.SET_PARTICIPATE_IN_META_METRICS_SUCCESS]:
    successSetParticipateInMetaMetrics,
  [Types.SET_PARTICIPATE_IN_META_METRICS_FAILURE]:
    failureSetParticipateInMetaMetrics,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST]:
    requestSetMetamaskNotificationsFeatureSeen,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS]:
    successSetMetamaskNotificationsFeatureSeen,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE]:
    failureSetMetamaskNotificationsFeatureSeen,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST]:
    requestFetchAndUpdateMetamaskNotifications,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS]:
    successFetchAndUpdateMetamaskNotifications,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE]:
    failureFetchAndUpdateMetamaskNotifications,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST]:
    requestMarkMetamaskNotificationsAsRead,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS]:
    successMarkMetamaskNotificationsAsRead,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE]:
    failureMarkMetamaskNotificationsAsRead,
  [Types.DELETE_NOTIFICATION_STATUS_REQUEST]: requestDeleteNotificationStatus,
  [Types.DELETE_NOTIFICATION_STATUS_SUCCESS]: successDeleteNotificationStatus,
  [Types.DELETE_NOTIFICATION_STATUS_FAILURE]: failureDeleteNotificationStatus,
});
