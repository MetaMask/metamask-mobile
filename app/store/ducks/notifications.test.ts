import Creators, {
  NotificationsTypes,
  INITIAL_STATE,
  pushNotificationsReducer,
} from './notifications';

describe('notificafications actions', () => {
  it('should return the expected action type for "performSignInRequest"', () => {
    expect(Creators.performSignInRequest()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_IN_REQUEST,
    });
  });
  it('should return the expected action type for "performSignInSuccess"', () => {
    expect(Creators.performSignInSuccess()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_IN_SUCCESS,
    });
  });
  it('should return the expected action type for "performSignInFailure"', () => {
    expect(Creators.performSignInFailure()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_IN_FAILURE,
    });
  });
  it('should return the expected action for "performSignOutRequest"', () => {
    expect(Creators.performSignOutRequest()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_OUT_REQUEST,
    });
  });
  it('should return the expected action for "performSignOutSuccess"', () => {
    expect(Creators.performSignOutSuccess()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_OUT_SUCCESS,
    });
  });
  it('should return the expected action for "performSignOutFailure"', () => {
    expect(Creators.performSignOutFailure()).toEqual({
      type: NotificationsTypes.PERFORM_SIGN_OUT_FAILURE,
    });
  });
  it('should return the expected action for "enableProfileSyncingRequest"', () => {
    expect(Creators.enableProfileSyncingRequest()).toEqual({
      type: NotificationsTypes.ENABLE_PROFILE_SYNCING_REQUEST,
    });
  });
  it('should return the expected action for "enableProfileSyncingSuccess"', () => {
    expect(Creators.enableProfileSyncingSuccess()).toEqual({
      type: NotificationsTypes.ENABLE_PROFILE_SYNCING_SUCCESS,
    });
  });
  it('should return the expected action for "enableProfileSyncingFailure"', () => {
    expect(Creators.enableProfileSyncingFailure()).toEqual({
      type: NotificationsTypes.ENABLE_PROFILE_SYNCING_FAILURE,
    });
  });
  it('should return the expected action for "disableProfileSyncingRequest"', () => {
    expect(Creators.disableProfileSyncingRequest()).toEqual({
      type: NotificationsTypes.DISABLE_PROFILE_SYNCING_REQUEST,
    });
  });
  it('should return the expected action for "disableProfileSyncingSuccess"', () => {
    expect(Creators.disableProfileSyncingSuccess()).toEqual({
      type: NotificationsTypes.DISABLE_PROFILE_SYNCING_SUCCESS,
    });
  });
  it('should return the expected action for "disableProfileSyncingFailure"', () => {
    expect(Creators.disableProfileSyncingFailure()).toEqual({
      type: NotificationsTypes.DISABLE_PROFILE_SYNCING_FAILURE,
    });
  });

  it('should return the expected action for "enablePushNotificationsRequest"', () => {
    expect(Creators.enablePushNotificationsRequest()).toEqual({
      type: NotificationsTypes.ENABLE_PUSH_NOTIFICATIONS_REQUEST,
    });
  });
  it('should return the expected action for "enablePushNotificationsSuccess"', () => {
    expect(Creators.enablePushNotificationsSuccess()).toEqual({
      type: NotificationsTypes.ENABLE_PUSH_NOTIFICATIONS_SUCCESS,
    });
  });
  it('should return the expected action for "enablePushNotificationsFailure"', () => {
    expect(Creators.enablePushNotificationsFailure()).toEqual({
      type: NotificationsTypes.ENABLE_PUSH_NOTIFICATIONS_FAILURE,
    });
  });
  it('should return the expected action for "disablePushNotificationsRequest"', () => {
    expect(Creators.disablePushNotificationsRequest()).toEqual({
      type: NotificationsTypes.DISABLE_PUSH_NOTIFICATIONS_REQUEST,
    });
  });
  it('should return the expected action for "disablePushNotificationsSuccess"', () => {
    expect(Creators.disablePushNotificationsSuccess()).toEqual({
      type: NotificationsTypes.DISABLE_PUSH_NOTIFICATIONS_SUCCESS,
    });
  });
  it('should return the expected action for "disablePushNotificationsFailure"', () => {
    expect(Creators.disablePushNotificationsFailure()).toEqual({
      type: NotificationsTypes.DISABLE_PUSH_NOTIFICATIONS_FAILURE,
    });
  });

  it('should return the expected action for "checkAccountsPresenceRequest"', () => {
    expect(Creators.checkAccountsPresenceRequest()).toEqual({
      type: NotificationsTypes.CHECK_ACCOUNTS_PRESENCE_REQUEST,
    });
  });
  it('should return the expected action for "checkAccountsPresenceSuccess"', () => {
    expect(Creators.checkAccountsPresenceSuccess()).toEqual({
      type: NotificationsTypes.CHECK_ACCOUNTS_PRESENCE_SUCCESS,
    });
  });
  it('should return the expected action for "checkAccountsPresenceFailure"', () => {
    expect(Creators.checkAccountsPresenceFailure()).toEqual({
      type: NotificationsTypes.CHECK_ACCOUNTS_PRESENCE_FAILURE,
    });
  });
  it('should return the expected action for "createOnChainTriggersByAccountRequest"', () => {
    expect(Creators.createOnChainTriggersByAccountRequest()).toEqual({
      type: NotificationsTypes.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    });
  });
  it('should return the expected action for "createOnChainTriggersByAccountSuccess"', () => {
    expect(Creators.createOnChainTriggersByAccountSuccess()).toEqual({
      type: NotificationsTypes.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS,
    });
  });
  it('should return the expected action for "createOnChainTriggersByAccountFailure"', () => {
    expect(Creators.createOnChainTriggersByAccountFailure()).toEqual({
      type: NotificationsTypes.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE,
    });
  });
  it('should return the expected action for "updateOnChainTriggersByAccountRequest"', () => {
    expect(Creators.updateOnChainTriggersByAccountRequest()).toEqual({
      type: NotificationsTypes.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    });
  });
  it('should return the expected action for "updateOnChainTriggersByAccountSuccess"', () => {
    expect(Creators.updateOnChainTriggersByAccountSuccess()).toEqual({
      type: NotificationsTypes.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS,
    });
  });
  it('should return the expected action for "updateOnChainTriggersByAccountFailure"', () => {
    expect(Creators.updateOnChainTriggersByAccountFailure()).toEqual({
      type: NotificationsTypes.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE,
    });
  });
  it('should return the expected action for "deleteOnChainTriggersByAccountRequest"', () => {
    expect(Creators.deleteOnChainTriggersByAccountRequest()).toEqual({
      type: NotificationsTypes.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    });
  });
  it('should return the expected action for "deleteOnChainTriggersByAccountSuccess"', () => {
    expect(Creators.deleteOnChainTriggersByAccountSuccess()).toEqual({
      type: NotificationsTypes.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS,
    });
  });
  it('should return the expected action for "deleteOnChainTriggersByAccountFailure"', () => {
    expect(Creators.deleteOnChainTriggersByAccountFailure()).toEqual({
      type: NotificationsTypes.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE,
    });
  });
  it('should return the expected action for "setFeatureAnnouncementsEnabledRequest"', () => {
    expect(Creators.setFeatureAnnouncementsEnabledRequest()).toEqual({
      type: NotificationsTypes.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST,
    });
  });
  it('should return the expected action for "setFeatureAnnouncementsEnabledSuccess"', () => {
    expect(Creators.setFeatureAnnouncementsEnabledSuccess()).toEqual({
      type: NotificationsTypes.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS,
    });
  });
  it('should return the expected action for "setFeatureAnnouncementsEnabledFailure"', () => {
    expect(Creators.setFeatureAnnouncementsEnabledFailure()).toEqual({
      type: NotificationsTypes.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE,
    });
  });
  it('should return the expected action for "setSnapNotificationsEnabledRequest"', () => {
    expect(Creators.setSnapNotificationsEnabledRequest()).toEqual({
      type: NotificationsTypes.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST,
    });
  });
  it('should return the expected action for "setSnapNotificationsEnabledSuccess"', () => {
    expect(Creators.setSnapNotificationsEnabledSuccess()).toEqual({
      type: NotificationsTypes.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS,
    });
  });
  it('should return the expected action for "setSnapNotificationsEnabledFailure"', () => {
    expect(Creators.setSnapNotificationsEnabledFailure()).toEqual({
      type: NotificationsTypes.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE,
    });
  });
  it('should return the expected action for "setParticipateInMetaMetricsRequest"', () => {
    expect(Creators.setParticipateInMetaMetricsRequest()).toEqual({
      type: NotificationsTypes.SET_PARTICIPATE_IN_META_METRICS_REQUEST,
    });
  });
  it('should return the expected action for "setParticipateInMetaMetricsSuccess"', () => {
    expect(Creators.setParticipateInMetaMetricsSuccess()).toEqual({
      type: NotificationsTypes.SET_PARTICIPATE_IN_META_METRICS_SUCCESS,
    });
  });
  it('should return the expected action for "setParticipateInMetaMetricsFailure"', () => {
    expect(Creators.setParticipateInMetaMetricsFailure()).toEqual({
      type: NotificationsTypes.SET_PARTICIPATE_IN_META_METRICS_FAILURE,
    });
  });
  it('should return the expected action for "setMetamaskNotificationsFeatureSeenRequest"', () => {
    expect(Creators.setMetamaskNotificationsFeatureSeenRequest()).toEqual({
      type: NotificationsTypes.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST,
    });
  });
  it('should return the expected action for "setMetamaskNotificationsFeatureSeenSuccess"', () => {
    expect(Creators.setMetamaskNotificationsFeatureSeenSuccess()).toEqual({
      type: NotificationsTypes.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS,
    });
  });
  it('should return the expected action for "setMetamaskNotificationsFeatureSeenFailure"', () => {
    expect(Creators.setMetamaskNotificationsFeatureSeenFailure()).toEqual({
      type: NotificationsTypes.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE,
    });
  });
  it('should return the expected action for "fetchAndUpdateMetamaskNotificationsRequest"', () => {
    expect(Creators.fetchAndUpdateMetamaskNotificationsRequest()).toEqual({
      type: NotificationsTypes.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST,
    });
  });
  it('should return the expected action for "fetchAndUpdateMetamaskNotificationsSuccess"', () => {
    expect(Creators.fetchAndUpdateMetamaskNotificationsSuccess()).toEqual({
      type: NotificationsTypes.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS,
    });
  });
  it('should return the expected action for "fetchAndUpdateMetamaskNotificationsFailure"', () => {
    expect(Creators.fetchAndUpdateMetamaskNotificationsFailure()).toEqual({
      type: NotificationsTypes.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE,
    });
  });
  it('should return the expected action for "markMetamaskNotificationsAsReadRequest"', () => {
    expect(Creators.markMetamaskNotificationsAsReadRequest()).toEqual({
      type: NotificationsTypes.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST,
    });
  });
  it('should return the expected action for "markMetamaskNotificationsAsReadSuccess"', () => {
    expect(Creators.markMetamaskNotificationsAsReadSuccess()).toEqual({
      type: NotificationsTypes.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS,
    });
  });
  it('should return the expected action for "markMetamaskNotificationsAsReadFailure"', () => {
    expect(Creators.markMetamaskNotificationsAsReadFailure()).toEqual({
      type: NotificationsTypes.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE,
    });
  });
  it('should return the expected action for "deleteNotificationStatusRequest"', () => {
    expect(Creators.deleteNotificationStatusRequest()).toEqual({
      type: NotificationsTypes.DELETE_NOTIFICATION_STATUS_REQUEST,
    });
  });
  it('should return the expected action for "deleteNotificationStatusSuccess"', () => {
    expect(Creators.deleteNotificationStatusSuccess()).toEqual({
      type: NotificationsTypes.DELETE_NOTIFICATION_STATUS_SUCCESS,
    });
  });
  it('should return the expected action for "deleteNotificationStatusFailure"', () => {
    expect(Creators.deleteNotificationStatusFailure()).toEqual({
      type: NotificationsTypes.DELETE_NOTIFICATION_STATUS_FAILURE,
    });
  });
});

describe('notificafications reducers', () => {
  it('should return initial state if passed nothing', () => {
    expect(pushNotificationsReducer()).toEqual(INITIAL_STATE);
  });
});
