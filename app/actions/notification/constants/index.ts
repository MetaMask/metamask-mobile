export enum notificationsErrors {
  ENABLE_PUSH_NOTIFICATIONS = 'Error while trying to enable push notifications',
  DISABLE_PUSH_NOTIFICATIONS = 'Error while trying to disable push notifications',
  CHECK_ACCOUNTS_PRESENCE = 'Error while trying to check accounts presence',
  DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT = 'Error while trying to delete on chain triggers by account',
  UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT = 'Error while trying to update on chain triggers by account',
  CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT = 'Error while trying to create on chain triggers by account',
  SET_FEATURE_ANNOUNCEMENTS_ENABLED = 'Error while trying to set feature announcements enabled',
  SET_SNAP_NOTIFICATIONS_ENABLED = 'Error while trying to set snap notifications enabled',
  SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN = 'Error while trying to set metamask notifications feature seen',
  FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS = 'Error while trying to fetch and update metamask notifications',
  MARK_METAMASK_NOTIFICATIONS_AS_READ = 'Error while trying to mark metamask notifications as read',
  DELETE_NOTIFICATION_STATUS = 'Error while trying to delete notification',
  SET_PARTICIPATE_IN_META_METRICS = 'Error while trying to set participate in meta metrics',
  UPDATE_TRIGGER_PUSH_NOTIFICATIONS = 'Error while trying to update trigger push notifications',
  ENABLE_NOTIFICATIONS_SERVICES = 'Error while trying to enable notifications services',
  DISABLE_NOTIFICATIONS_SERVICES = 'Error while trying to disable notifications services',
  DELETE_STORAGE_KEY = 'Error while trying to delete storage key',
}

export default notificationsErrors;
