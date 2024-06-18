/** THE TYPES BELLOW ARE FOR THE NEW METAMASK NOTIFICATIONS FEATURE
 * WE ARE USING THE DUCK PATTERN WITH REDUX SAUCE FOR NEW NOTIFICATIONS
 */
import { createActions, createReducer } from 'reduxsauce';
import DefaultPreference from 'react-native-default-preference';
import { AGREED, DENIED, METRICS_OPT_IN } from '../../constants/storage';
import { Notification } from '../../util/notifications';
import { error } from 'console';

export const { Types, Creators } = createActions({
  // handle loading for any action
  // showLoadingIndication: [],
  // hideLoadingIndication: [],
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
  enablePushNotificationsRequest: [],
  enablePushNotificationsSuccess: [],
  enablePushNotificationsFailure: ['error'],
  disablePushNotificationsRequest: [],
  disablePushNotificationsSuccess: [],
  disablePushNotificationsFailure: ['error'],
  // handle checking accounts presence
  checkAccountsPresenceRequest: ['accounts'],
  checkAccountsPresenceSuccess: [],
  checkAccountsPresenceFailure: ['error'],
  // handle on chain triggers
  createOnChainTriggersByAccountRequest: [],
  createOnChainTriggersByAccountSuccess: [],
  createOnChainTriggersByAccountFailure: ['error'],
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
  markMetamaskNotificationsAsReadRequest: ['notifications'],
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
  error?: any;
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
interface IPushNotificationsState {
  pushNotifications: {
    isSignedIn: IsEnabled;
    isProfileSyncingEnabled: IsEnabled;
    isParticipatingInMetaMetrics: IsEnabled;
    enable: IsEnabled;
    isSnapNotificationsEnabled: IsEnabled;
    isFeatureAnnouncementsEnabled: IsEnabled;
    isCheckingAccountsPresence: IsEnabled;
    isUpdatingMetamaskNotifications: IsEnabled;
    hasSeenNotificationsFeature: IsEnabled;
    isFetchingMetamaskNotification: IsEnabled;
    isUpdatingMetamaskNotificationsAccounts: IsEnabled;
    metamaskNotificationsList: Notification[];
    metamaskNotificationsReadList: Notification[];
    sessionData?: SessionData;
    internalAccounts: any[];
    uniqueAccounts: any[];
    isUpdatingMetamaskNotificationsAccount: any[];
  };
}

export const INITIAL_STATE: IPushNotificationsState = {
  pushNotifications: {
    isSignedIn: {
      loading: false,
      status: false,
    },
    isProfileSyncingEnabled: {
      loading: false,
      status: true,
    },
    isParticipatingInMetaMetrics: {
      loading: false,
      status: false,
    },
    enable: {
      loading: false,
      status: false,
    },
    isSnapNotificationsEnabled: {
      loading: false,
      status: false,
    },
    isFeatureAnnouncementsEnabled: {
      loading: false,
      status: false,
    },
    isCheckingAccountsPresence: {
      loading: false,
      status: false,
    },
    isUpdatingMetamaskNotifications: {
      loading: false,
      status: false,
    },
    hasSeenNotificationsFeature: {
      loading: false,
      status: false,
    },
    isFetchingMetamaskNotification: {
      loading: false,
      error: null,
      status: false,
    },
    isUpdatingMetamaskNotificationsAccounts: {
      loading: false,
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
};
const performSignInRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const performSignInSuccess = (action: any, state = INITIAL_STATE) => {
  const { accessToken, expiresIn } = action;
  return {
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
  };
};
const performSignInFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isSignedIn: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const performSignOutRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSignedIn: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const performSignOutSuccess = (state = INITIAL_STATE) => ({
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
const performSignOutFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isSignedIn: {
        loading: false,
        error,
        status: true,
      },
    },
  };
};
const enableProfileSyncingRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const enableProfileSyncingSuccess = (
  action: Profile,
  state = INITIAL_STATE,
) => {
  const { identifierId, profileId, metametricsId } = action;
  return {
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
  };
};
const enableProfileSyncingFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isProfileSyncingEnabled: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const disableProfileSyncingRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const disableProfileSyncingSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isProfileSyncingEnabled: {
      loading: false,
      error: null,
      status: false,
    },
  },
});
const disableProfileSyncingFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isProfileSyncingEnabled: {
        loading: false,
        error,
        status: true,
      },
    },
  };
};
const enablePushNotificationsRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    enable: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const enablePushNotificationsSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    enable: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const enablePushNotificationsFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      enable: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const disablePushNotificationsRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    enable: {
      loading: true,
      error: null,
      status: true,
    },
  },
});
const disablePushNotificationsSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    enable: {
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
    isUpdatingMetamaskNotifications: {
      loading: false,
      error: null,
      status: false,
    },
  },
});
const disablePushNotificationsFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      enable: {
        loading: false,
        error,
        status: true,
      },
    },
  };
};
const setFeatureAnnouncementsEnabledRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFeatureAnnouncementsEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const setFeatureAnnouncementsEnabledSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFeatureAnnouncementsEnabled: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const setFeatureAnnouncementsEnabledFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isFeatureAnnouncementsEnabled: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const setSnapNotificationsEnabledRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSnapNotificationsEnabled: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const setSnapNotificationsEnabledSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isSnapNotificationsEnabled: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const setSnapNotificationsEnabledFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isSnapNotificationsEnabled: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const checkAccountsPresenceRequest = (action: any, state = INITIAL_STATE) => {
  const { accounts } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isCheckingAccountsPresence: {
        loading: true,
        error: null,
        status: false,
      },
    },
  };
};
const checkAccountsPresenceSuccess = (action: any, state = INITIAL_STATE) => {
  const { presence } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isCheckingAccountsPresence: {
        loading: false,
        error: null,
        status: true,
      },
    },
  };
};
const checkAccountsPresenceFailure = (action: any, state = INITIAL_STATE) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isCheckingAccountsPresence: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const setParticipateInMetaMetricsRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isParticipatingInMetaMetrics: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const setParticipateInMetaMetricsSuccess = async (state = INITIAL_STATE) => {
  await DefaultPreference.get(AGREED);
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isParticipatingInMetaMetrics: {
        loading: false,
        error: null,
        status: true,
      },
    },
  };
};
const setParticipateInMetaMetricsFailure = async (
  action: any,
  state = INITIAL_STATE,
) => {
  await DefaultPreference.get(DENIED);
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isParticipatingInMetaMetrics: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const setMetamaskNotificationsFeatureSeenRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    hasSeenNotificationsFeature: {
      loading: true,
      error: null,
      status: false,
    },
  },
});
const setMetamaskNotificationsFeatureSeenSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
    hasSeenNotificationsFeature: {
      loading: false,
      error: null,
      status: true,
    },
  },
});
const setMetamaskNotificationsFeatureSeenFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      hasSeenNotificationsFeature: {
        loading: false,
        error,
        status: false,
      },
    },
  };
};
const updateOnChainTriggersByAccountRequest = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { accounts } = action;

  return {
    pushNotifications: {
      ...state.pushNotifications,
    },
  };
};
const updateOnChainTriggersByAccountSuccess = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { accounts } = action;

  return {
    pushNotifications: {
      ...state.pushNotifications,
      uniqueAccounts: new Set([
        ...state.pushNotifications.isUpdatingMetamaskNotificationsAccount,
        ...accounts,
      ]),
    },
  };
};
const updateOnChainTriggersByAccountFailure = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const fetchAndUpdateMetamaskNotificationsRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const fetchAndUpdateMetamaskNotificationsSuccess = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { metamaskNotificationsList, metamaskNotificationsReadList } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      isFetchingMetamaskNotification: {
        loading: false,
        error: null,
        status: true,
      },
      metamaskNotificationsList,
      metamaskNotificationsReadList,
    },
  };
};
const fetchAndUpdateMetamaskNotificationsFailure = (
  action: any,
  state = INITIAL_STATE,
) => ({
  pushNotifications: {
    ...state.pushNotifications,
    isFetchingMetamaskNotification: {
      loading: false,
      error: action.error,
      status: true,
    },
  },
});
const markMetamaskNotificationsAsReadRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const markMetamaskNotificationsAsReadSuccess = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { metamaskNotificationsList, metamaskNotificationsReadList } = action;

  return {
    pushNotifications: {
      ...state.pushNotifications,
      metamaskNotificationsList,
      metamaskNotificationsReadList,
    },
  };
};
const markMetamaskNotificationsAsReadFailure = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const deleteNotificationStatusRequest = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { notifications } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
    },
  };
};
const deleteNotificationStatusSuccess = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { metamaskNotificationsList } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
      metamaskNotificationsList,
    },
  };
};
const deleteNotificationStatusFailure = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
// TODO: Work on these below
const createOnChainTriggersByAccountRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const createOnChainTriggersByAccountSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const createOnChainTriggersByAccountFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
    },
  };
};
const deleteOnChainTriggersByAccountRequest = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const deleteOnChainTriggersByAccountSuccess = (state = INITIAL_STATE) => ({
  pushNotifications: {
    ...state.pushNotifications,
  },
});
const deleteOnChainTriggersByAccountFailure = (
  action: any,
  state = INITIAL_STATE,
) => {
  const { error } = action;
  return {
    pushNotifications: {
      ...state.pushNotifications,
    },
  };
};

export const HANDLERS = {
  [Types.PERFORM_SIGN_IN_REQUEST]: performSignInRequest,
  [Types.PERFORM_SIGN_IN_SUCCESS]: performSignInSuccess,
  [Types.PERFORM_SIGN_IN_FAILURE]: performSignInFailure,
  [Types.PERFORM_SIGN_OUT_REQUEST]: performSignOutRequest,
  [Types.PERFORM_SIGN_OUT_SUCCESS]: performSignOutSuccess,
  [Types.PERFORM_SIGN_OUT_FAILURE]: performSignOutFailure,
  [Types.ENABLE_PROFILE_SYNCING_REQUEST]: enableProfileSyncingRequest,
  [Types.ENABLE_PROFILE_SYNCING_SUCCESS]: enableProfileSyncingSuccess,
  [Types.ENABLE_PROFILE_SYNCING_FAILURE]: enableProfileSyncingFailure,
  [Types.DISABLE_PROFILE_SYNCING_REQUEST]: disableProfileSyncingRequest,
  [Types.DISABLE_PROFILE_SYNCING_SUCCESS]: disableProfileSyncingSuccess,
  [Types.DISABLE_PROFILE_SYNCING_FAILURE]: disableProfileSyncingFailure,
  [Types.ENABLE_PUSH_NOTIFICATIONS_REQUEST]: enablePushNotificationsRequest,
  [Types.ENABLE_PUSH_NOTIFICATIONS_SUCCESS]: enablePushNotificationsSuccess,
  [Types.ENABLE_PUSH_NOTIFICATIONS_FAILURE]: enablePushNotificationsFailure,
  [Types.DISABLE_PUSH_NOTIFICATIONS_REQUEST]: disablePushNotificationsRequest,
  [Types.DISABLE_PUSH_NOTIFICATIONS_SUCCESS]: disablePushNotificationsSuccess,
  [Types.DISABLE_PUSH_NOTIFICATIONS_FAILURE]: disablePushNotificationsFailure,
  [Types.CHECK_ACCOUNTS_PRESENCE_REQUEST]: checkAccountsPresenceRequest,
  [Types.CHECK_ACCOUNTS_PRESENCE_SUCCESS]: checkAccountsPresenceSuccess,
  [Types.CHECK_ACCOUNTS_PRESENCE_FAILURE]: checkAccountsPresenceFailure,
  [Types.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST]:
    createOnChainTriggersByAccountRequest,
  [Types.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS]:
    createOnChainTriggersByAccountSuccess,
  [Types.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE]:
    createOnChainTriggersByAccountFailure,
  [Types.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST]:
    deleteOnChainTriggersByAccountRequest,
  [Types.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS]:
    deleteOnChainTriggersByAccountSuccess,
  [Types.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE]:
    deleteOnChainTriggersByAccountFailure,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST]:
    updateOnChainTriggersByAccountRequest,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS]:
    updateOnChainTriggersByAccountSuccess,
  [Types.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE]:
    updateOnChainTriggersByAccountFailure,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST]:
    setFeatureAnnouncementsEnabledRequest,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS]:
    setFeatureAnnouncementsEnabledSuccess,
  [Types.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE]:
    setFeatureAnnouncementsEnabledFailure,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST]:
    setSnapNotificationsEnabledRequest,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS]:
    setSnapNotificationsEnabledSuccess,
  [Types.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE]:
    setSnapNotificationsEnabledFailure,
  [Types.SET_PARTICIPATE_IN_META_METRICS_REQUEST]:
    setParticipateInMetaMetricsRequest,
  [Types.SET_PARTICIPATE_IN_META_METRICS_SUCCESS]:
    setParticipateInMetaMetricsSuccess,
  [Types.SET_PARTICIPATE_IN_META_METRICS_FAILURE]:
    setParticipateInMetaMetricsFailure,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST]:
    setMetamaskNotificationsFeatureSeenRequest,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS]:
    setMetamaskNotificationsFeatureSeenSuccess,
  [Types.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE]:
    setMetamaskNotificationsFeatureSeenFailure,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST]:
    fetchAndUpdateMetamaskNotificationsRequest,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS]:
    fetchAndUpdateMetamaskNotificationsSuccess,
  [Types.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE]:
    fetchAndUpdateMetamaskNotificationsFailure,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST]:
    markMetamaskNotificationsAsReadRequest,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS]:
    markMetamaskNotificationsAsReadSuccess,
  [Types.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE]:
    markMetamaskNotificationsAsReadFailure,
  [Types.DELETE_NOTIFICATION_STATUS_REQUEST]: deleteNotificationStatusRequest,
  [Types.DELETE_NOTIFICATION_STATUS_SUCCESS]: deleteNotificationStatusSuccess,
  [Types.DELETE_NOTIFICATION_STATUS_FAILURE]: deleteNotificationStatusFailure,
};

export const pushNotificationsReducer = createReducer(INITIAL_STATE, HANDLERS);
