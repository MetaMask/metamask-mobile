import { NotificationTypes } from '../../util/notifications';
const { TRANSACTION, SIMPLE } = NotificationTypes;

export const initialState = {
  notifications: [],
  notification: {
    notificationsSettings: {},
  },
};

export const ACTIONS = {
  HIDE_CURRENT_NOTIFICATION: 'HIDE_CURRENT_NOTIFICATION',
  HIDE_NOTIFICATION_BY_ID: 'HIDE_NOTIFICATION_BY_ID',
  MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION:
    'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION',
  MODIFY_OR_SHOW_SIMPLE_NOTIFICATION: 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION',
  REPLACE_NOTIFICATION_BY_ID: 'REPLACE_NOTIFICATION_BY_ID',
  REMOVE_NOTIFICATION_BY_ID: 'REMOVE_NOTIFICATION_BY_ID',
  REMOVE_CURRENT_NOTIFICATION: 'REMOVE_CURRENT_NOTIFICATION',
  REMOVE_NOT_VISIBLE_NOTIFICATIONS: 'REMOVE_NOT_VISIBLE_NOTIFICATIONS',
  SHOW_SIMPLE_NOTIFICATION: 'SHOW_SIMPLE_NOTIFICATION',
  SHOW_TRANSACTION_NOTIFICATION: 'SHOW_TRANSACTION_NOTIFICATION',
  UPDATE_NOTIFICATION_STATUS: 'UPDATE_NOTIFICATION_STATUS',
  /** THE ACTIONS BELLOW ARE FOR THE NEW METAMASK NOTIFICATIONS FEATURE */
  PERFORM_SIGN_IN: 'PERFORM_SIGN_IN',
  PERFORM_SIGN_OUT: 'PERFORM_SIGN_OUT',
  ENABLE_PROFILE_SYNCING: 'ENABLE_PROFILE_SYNCING',
  DISABLE_PROFILE_SYNCING: 'DISABLE_PROFILE_SYNCING',
  SET_PARTICIPATE_IN_METAMETRICS: 'SET_PARTICIPATE_IN_METAMETRICS',
  SHOW_LOADING_INDICATION: 'SHOW_LOADING_INDICATION',
  HIDE_LOADING_INDICATION: 'HIDE_LOADING_INDICATION',
  CREATE_ON_CHAIN_TRIGGERS: 'CREATE_ON_CHAIN_TRIGGERS',
  FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS:
    'FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS',
  MARK_METAMASK_NOTIFICATIONS_AS_READ: 'MARK_METAMASK_NOTIFICATIONS_AS_READ',
  SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN:
    'SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN',
  DISABLE_METAMASK_NOTIFICATIONS: 'DISABLE_METAMASK_NOTIFICATIONS',
  ENABLE_METAMASK_NOTIFICATIONS: 'ENABLE_METAMASK_NOTIFICATIONS',
  SET_IS_PROFILE_SYNCING_ENABLED: 'SET_IS_PROFILE_SYNCING_ENABLED',
  SET_SNAP_NOTIFICATIONS_ENABLED: 'SET_SNAP_NOTIFICATIONS_ENABLED',
  SET_FEATURE_ANNOUNCEMENTS_ENABLED: 'SET_FEATURE_ANNOUNCEMENTS_ENABLED',
  CHECK_ACCOUNTS_PRESENCE: 'CHECK_ACCOUNTS_PRESENCE',
  DELETE_NOTIFICATION_STATUS: 'DELETE_NOTIFICATION_STATUS',
  UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT: 'UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT',
};

const enqueue = (notifications, notification) => [
  ...notifications,
  notification,
];
const dequeue = (notifications) => notifications.slice(1);

export const currentNotificationSelector = (state) =>
  state?.notifications[0] || {};

const notificationReducer = (state = initialState, action) => {
  const { notifications } = state;
  switch (action.type) {
    // make current notification isVisible props false
    case ACTIONS.HIDE_CURRENT_NOTIFICATION: {
      if (notifications[0]) {
        return {
          ...state,
          notifications: [
            { ...notifications[0], isVisible: false },
            ...notifications.slice(1),
          ],
        };
      }
      return state;
    }
    case ACTIONS.HIDE_NOTIFICATION_BY_ID: {
      const index = notifications.findIndex(({ id }) => id === action.id);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        notifications: [
          ...notifications.slice(0, index),
          { ...notifications[index], isVisible: false },
          ...notifications.slice(index + 1),
        ],
      };
    }
    case ACTIONS.MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION: {
      const index = notifications.findIndex(({ id }) => id === action.id);
      if (index >= 0) {
        return {
          ...state,
          notifications: [
            ...notifications.slice(0, index),
            {
              ...notifications[index],
              ...{
                id: action.transaction.id,
                isVisible: true,
                autodismiss: action.autodismiss,
                transaction: action.transaction,
                status: action.status,
                type: TRANSACTION,
              },
            },
            ...notifications.slice(index + 1),
          ],
        };
      }
      return {
        ...state,
        notifications: enqueue(notifications, {
          id: action.transaction.id,
          isVisible: true,
          autodismiss: action.autodismiss,
          transaction: action.transaction,
          status: action.status,
          type: TRANSACTION,
        }),
      };
    }
    case ACTIONS.MODIFY_OR_SHOW_SIMPLE_NOTIFICATION: {
      const index = notifications.findIndex(({ id }) => id === action.id);
      if (index >= 0) {
        return {
          ...state,
          notifications: [
            ...notifications.slice(0, index),
            {
              ...notifications[index],
              ...{
                id: action.id,
                isVisible: true,
                autodismiss: action.autodismiss,
                title: action.title,
                description: action.description,
                status: action.status,
                type: SIMPLE,
              },
            },
            ...notifications.slice(index + 1),
          ],
        };
      }
      return {
        ...state,
        notifications: enqueue(notifications, {
          id: action.id,
          isVisible: true,
          autodismiss: action.autodismiss,
          title: action.title,
          description: action.description,
          status: action.status,
          type: SIMPLE,
        }),
      };
    }
    case ACTIONS.REPLACE_NOTIFICATION_BY_ID: {
      const index = notifications.findIndex(({ id }) => id === action.id);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        notifications: [
          ...notifications.slice(0, index),
          action.notification,
          ...notifications.slice(index + 1),
        ],
      };
    }
    case ACTIONS.REMOVE_NOTIFICATION_BY_ID: {
      return {
        ...state,
        notifications: notifications.filter(({ id }) => id !== action.id),
      };
    }
    case ACTIONS.REMOVE_CURRENT_NOTIFICATION: {
      return {
        ...state,
        notifications: dequeue(notifications),
      };
    }
    case ACTIONS.SHOW_SIMPLE_NOTIFICATION: {
      return {
        ...state,
        notifications: enqueue(notifications, {
          id: action.id,
          isVisible: true,
          autodismiss: action.autodismiss || 5000,
          title: action.title,
          description: action.description,
          status: action.status,
          type: SIMPLE,
        }),
      };
    }
    case ACTIONS.SHOW_TRANSACTION_NOTIFICATION: {
      return {
        ...state,
        notifications: enqueue(notifications, {
          id: action.transaction.id,
          isVisible: true,
          autodismiss: action.autodismiss || 5000,
          transaction: action.transaction,
          status: action.status,
          type: TRANSACTION,
        }),
      };
    }
    case ACTIONS.REMOVE_NOT_VISIBLE_NOTIFICATIONS: {
      const visibleNotifications =
        notifications?.filter((notification) => notification.isVisible) || [];
      return {
        ...state,
        notifications: visibleNotifications,
      };
    }
    case ACTIONS.UPDATE_NOTIFICATION_STATUS: {
      return {
        ...state,
        notificationsSettings: action.notificationsSettings,
      };
    }
    case ACTIONS.PERFORM_SIGN_IN: {
    }
    case ACTIONS.PERFORM_SIGN_OUT: {
    }
    case ACTIONS.ENABLE_PROFILE_SYNCING: {
    }
    case ACTIONS.DISABLE_PROFILE_SYNCING: {
    }
    case ACTIONS.SET_PARTICIPATE_IN_METAMETRICS: {
      return {
        ...state,
        notifications: {
          isParticipating: action.isParticipating,
        },
      };
    }
    case ACTIONS.SHOW_LOADING_INDICATION: {
    }
    case ACTIONS.HIDE_LOADING_INDICATION: {
    }
    case ACTIONS.CREATE_ON_CHAIN_TRIGGERS: {
    }
    case ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS: {
    }
    case ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ: {
      return {
        ...state,
        notifications: {
          notifications: action.notifications,
        },
      };
    }
    case ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN: {
    }
    case ACTIONS.DISABLE_METAMASK_NOTIFICATIONS: {
    }
    case ACTIONS.ENABLE_METAMASK_NOTIFICATIONS: {
    }
    case ACTIONS.SET_IS_PROFILE_SYNCING_ENABLED: {
      return {
        ...state,
        notifications: {
          profileSyncStatus: action.profileSyncStatus,
        },
      };
    }
    case ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED: {
      return {
        ...state,
        notifications: {
          snapNotificationsStatus: action.snapNotificationsStatus,
        },
      };
    }
    case ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED: {
      return {
        ...state,
        notifications: {
          featureAnnouncementsStatus: action.featureAnnouncementsStatus,
        },
      };
    }
    case ACTIONS.CHECK_ACCOUNTS_PRESENCE: {
      return {
        ...state,
        notifications: {
          accounts: action.accounts,
        },
      };
    }
    case ACTIONS.DELETE_NOTIFICATION_STATUS: {
      return {
        ...state,
        notifications: {
          addresses: action.addresses,
        },
      };
    }
    case ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT: {
      return {
        ...state,
        notifications: {
          addresses: action.addresses,
        },
      };
    }
    default:
      return state;
  }
};
export default notificationReducer;
