import { sign } from 'crypto';
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
  PERFORM_SIGN_IN_REQUEST: 'PERFORM_SIGN_IN_REQUEST',
  PERFORM_SIGN_IN_SUCCESS: 'PERFORM_SIGN_IN_SUCCESS',
  PERFORM_SIGN_IN_FAILURE: 'PERFORM_SIGN_IN_FAILURE',

  PERFORM_SIGN_OUT_REQUEST: 'PERFORM_SIGN_OUT_REQUEST',
  PERFORM_SIGN_OUT_SUCCESS: 'PERFORM_SIGN_OUT_SUCCESS',
  PERFORM_SIGN_OUT_FAILURE: 'PERFORM_SIGN_OUT_FAILURE',

  ENABLE_PROFILE_SYNCING_REQUEST: 'ENABLE_PROFILE_SYNCING_REQUEST',
  ENABLE_PROFILE_SYNCING_SUCCESS: 'ENABLE_PROFILE_SYNCING_SUCCESS',
  ENABLE_PROFILE_SYNCING_FAILURE: 'ENABLE_PROFILE_SYNCING_FAILURE',

  DISABLE_PROFILE_SYNCING_REQUEST: 'DISABLE_PROFILE_SYNCING_REQUEST',
  DISABLE_PROFILE_SYNCING_SUCCESS: 'DISABLE_PROFILE_SYNCING_SUCCESS',
  DISABLE_PROFILE_SYNCING_FAILURE: 'DISABLE_PROFILE_SYNCING_FAILURE',

  SET_PARTICIPATE_IN_METAMETRICS_REQUEST:
    'SET_PARTICIPATE_IN_METAMETRICS_REQUEST',
  SET_PARTICIPATE_IN_METAMETRICS_SUCCESS:
    'SET_PARTICIPATE_IN_METAMETRICS_SUCCESS',
  SET_PARTICIPATE_IN_METAMETRICS_FAILURE:
    'SET_PARTICIPATE_IN_METAMETRICS_FAILURE',

  SHOW_LOADING: 'SHOW_LOADING_INDICATION',
  HIDE_LOADING: 'HIDE_LOADING_INDICATION',
  CREATE_ON_CHAIN_TRIGGERS_REQUEST: 'CREATE_ON_CHAIN_TRIGGERS_REQUEST',
  CREATE_ON_CHAIN_TRIGGERS_SUCCESS: 'CREATE_ON_CHAIN_TRIGGERS_SUCCESS',
  CREATE_ON_CHAIN_TRIGGERS_FAILURE: 'CREATE_ON_CHAIN_TRIGGERS_FAILURE',

  FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST:
    'FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST',
  FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS:
    'FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS',
  FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE:
    'FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE',

  MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST:
    'MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST',
  MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS:
    'MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS',
  MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE:
    'MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE',

  SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST:
    'SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST',
  SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS:
    'SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS',
  SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE:
    'SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE',

  DISABLE_METAMASK_NOTIFICATIONS_REQUEST:
    'DISABLE_METAMASK_NOTIFICATIONS_REQUEST',
  DISABLE_METAMASK_NOTIFICATIONS_SUCCESS:
    'DISABLE_METAMASK_NOTIFICATIONS_SUCCESS',
  DISABLE_METAMASK_NOTIFICATIONS_FAILURE:
    'DISABLE_METAMASK_NOTIFICATIONS_FAILURE',

  ENABLE_METAMASK_NOTIFICATIONS_REQUEST:
    'ENABLE_METAMASK_NOTIFICATIONS_REQUEST',
  ENABLE_METAMASK_NOTIFICATIONS_SUCCESS:
    'ENABLE_METAMASK_NOTIFICATIONS_SUCCESS',
  ENABLE_METAMASK_NOTIFICATIONS_FAILURE:
    'ENABLE_METAMASK_NOTIFICATIONS_FAILURE',

  SET_IS_PROFILE_SYNCING_ENABLED_REQUEST:
    'SET_IS_PROFILE_SYNCING_ENABLED_REQUEST',
  SET_IS_PROFILE_SYNCING_ENABLED_SUCCESS:
    'SET_IS_PROFILE_SYNCING_ENABLED_SUCCESS',
  SET_IS_PROFILE_SYNCING_ENABLED_FAILURE:
    'SET_IS_PROFILE_SYNCING_ENABLED_FAILURE',

  SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST:
    'SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST',
  SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS:
    'SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS',
  SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE:
    'SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE',

  SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST:
    'SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST',
  SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS:
    'SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS',
  SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE:
    'SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE',

  CHECK_ACCOUNTS_PRESENCE_REQUEST: 'CHECK_ACCOUNTS_PRESENCE_REQUEST',
  CHECK_ACCOUNTS_PRESENCE_SUCCESS: 'CHECK_ACCOUNTS_PRESENCE_SUCCESS',
  CHECK_ACCOUNTS_PRESENCE_FAILURE: 'CHECK_ACCOUNTS_PRESENCE_FAILURE',

  DELETE_NOTIFICATION_STATUS_REQUEST: 'DELETE_NOTIFICATION_STATUS_REQUEST',
  DELETE_NOTIFICATION_STATUS_SUCCESS: 'DELETE_NOTIFICATION_STATUS_SUCCESS',
  DELETE_NOTIFICATION_STATUS_FAILURE: 'DELETE_NOTIFICATION_STATUS_FAILURE',

  UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST:
    'UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST',
  UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS:
    'UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS',
  UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE:
    'UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE',
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
    case ACTIONS.PERFORM_SIGN_IN_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          signIn: {
            loading: true,
            error: null,
            status: state.notificationsSettings.signIn.status,
          },
        },
      };
    }
    case ACTIONS.PERFORM_SIGN_IN_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          signIn: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.PERFORM_SIGN_IN_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          signIn: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.PERFORM_SIGN_OUT_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          signIn: {
            loading: true,
            error: null,
            status: state.notificationsSettings.signIn.status,
          },
        },
      };
    }
    case ACTIONS.PERFORM_SIGN_OUT_SUCCESS: {
      return {
        ...state,
        notifications: {
          ...state,
          signIn: {
            loading: false,
            error: null,
            status: false,
          },
        },
      };
    }
    case ACTIONS.PERFORM_SIGN_OUT_FAILURE: {
      return {
        ...state,
        notifications: {
          ...state,
          signIn: {
            loading: false,
            error: action.error,
            status: true,
          },
        },
      };
    }
    case ACTIONS.ENABLE_PROFILE_SYNCING_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: true,
            error: null,
            status: state.notificationsSettings.profileSyncing.status,
          },
        },
      };
    }
    case ACTIONS.ENABLE_PROFILE_SYNCING_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.ENABLE_PROFILE_SYNCING_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.DISABLE_PROFILE_SYNCING_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: true,
            error: null,
            status: state.notificationsSettings.profileSyncing.status,
          },
        },
      };
    }
    case ACTIONS.DISABLE_PROFILE_SYNCING_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: false,
            error: null,
            status: false,
          },
        },
      };
    }
    case ACTIONS.DISABLE_PROFILE_SYNCING_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          profileSyncing: {
            loading: false,
            error: action.error,
            status: true,
          },
        },
      };
    }
    case ACTIONS.SET_PARTICIPATE_IN_METAMETRICS_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          participateInMetaMetrics: {
            loading: true,
            status: state.notificationsSettings.participateInMetaMetrics.status,
            error: null,
          },
        },
      };
    }
    case ACTIONS.SET_PARTICIPATE_IN_METAMETRICS_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          participateInMetaMetrics: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.SET_PARTICIPATE_IN_METAMETRICS_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          participateInMetaMetrics: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.CREATE_ON_CHAIN_TRIGGERS_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          createOnChainTriggers: {
            loading: true,
            status: state.notificationsSettings.createOnChainTriggers.status,
            error: null,
          },
        },
      };
    }
    case ACTIONS.CREATE_ON_CHAIN_TRIGGERS_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          createOnChainTriggers: {
            loading: false,
            status: true,
            error: null,
          },
        },
      };
    }
    case ACTIONS.CREATE_ON_CHAIN_TRIGGERS_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          createOnChainTriggers: {
            loading: false,
            status: false,
            error: action.error,
          },
        },
      };
    }
    // case ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST: {
    //   return {
    //     ...state,
    //     notifications: {
    //       ...state,
    //       fetchAndUpdateMetamaskNotifications: {
    //         loading: true,
    //         data: state.notifications.fetched.data,
    //         error: null,
    //       },
    //     },
    //   };
    // }
    // case ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS: {
    //   return {
    //     ...state,
    //     notifications: {
    //       ...state,
    //       fetchAndUpdateMetamaskNotifications: {
    //         loading: false,
    //         data: action.data,
    //         error: null,
    //       },
    //     },
    //   };
    // }
    // case ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE: {
    //   return {
    //     ...state,
    //     notifications: {
    //       ...state,
    //       fetchAndUpdateMetamaskNotifications: {
    //         loading: false,
    //         data: state.notifications.fetched.data,
    //         error: action.error,
    //       },
    //     },
    //   };
    // }
    // case ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST: {
    //   return {
    //     ...state,
    //     notifications: {
    //       ...state,
    //       notificationsAsRead: {
    //         loading: false,
    //         data: state.notifications.data,
    //         error: action.error,
    //       },
    //     },
    //   };
    // }
    // case ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS: {
    // }
    // case ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE: {
    // }
    // case ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST: {
    // }
    // case ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS: {
    // }
    // case ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE: {
    // }
    case ACTIONS.DISABLE_METAMASK_NOTIFICATIONS_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: true,
            error: null,
            status: state.notificationsSettings.isEnabled.status,
          },
        },
      };
    }
    case ACTIONS.DISABLE_METAMASK_NOTIFICATIONS_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: false,
            error: null,
            status: false,
          },
        },
      };
    }
    case ACTIONS.DISABLE_METAMASK_NOTIFICATIONS_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: false,
            error: action.error,
            status: true,
          },
        },
      };
    }
    case ACTIONS.ENABLE_METAMASK_NOTIFICATIONS_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: true,
            error: null,
            status: state.notificationsSettings.isEnabled.status,
          },
        },
      };
    }
    case ACTIONS.ENABLE_METAMASK_NOTIFICATIONS_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.ENABLE_METAMASK_NOTIFICATIONS_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          isEnabled: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          snapNotificationsEnabled: {
            loading: true,
            error: null,
            status: state.notificationsSettings.snapNotificationsEnabled.status,
          },
        },
      };
    }
    case ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          snapNotificationsEnabled: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          snapNotificationsEnabled: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          featureAnnouncementsEnabled: {
            loading: true,
            error: null,
            status:
              state.notificationsSettings.featureAnnouncementsEnabled.status,
          },
        },
      };
    }
    case ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          featureAnnouncementsEnabled: {
            loading: false,
            error: null,
            status: true,
          },
        },
      };
    }
    case ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          featureAnnouncementsEnabled: {
            loading: false,
            error: action.error,
            status: false,
          },
        },
      };
    }
    case ACTIONS.CHECK_ACCOUNTS_PRESENCE_REQUEST: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          checkAccountsPresence: {
            loading: true,
            error: null,
            accounts: action.data,
          },
        },
      };
    }
    case ACTIONS.CHECK_ACCOUNTS_PRESENCE_SUCCESS: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          checkAccountsPresence: {
            loading: false,
            error: null,
            accounts: action.data,
          },
        },
      };
    }
    case ACTIONS.CHECK_ACCOUNTS_PRESENCE_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          checkAccountsPresence: {
            loading: false,
            error: action.error,
            accounts: action.accounts,
          },
        },
      };
    }
    // case ACTIONS.DELETE_NOTIFICATION_STATUS_REQUEST: {
    //   return {
    //     ...state,
    //     notificationsSettings: {
    //       addresses: action.addresses,
    //     },
    //   };
    // }
    // case ACTIONS.DELETE_NOTIFICATION_STATUS_SUCCESS: {
    // }
    // case ACTIONS.DELETE_NOTIFICATION_STATUS_FAILURE: {
    // }
    // case ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST: {
    //   return {
    //     ...state,
    //     notificationsSettings: {
    //       ...state,
    //       loading: true,
    //       error: null,
    //       isUpdatingMetamaskNotificationsAccount: action.data,
    //     },
    //   };
    // }
    case ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS: {
      const uniqueAccounts = new Set([
        ...state.isUpdatingMetamaskNotificationsAccount,
        ...action.accounts,
      ]);

      return {
        ...state,
        notificationsSettings: {
          ...state,
          loading: false,
          error: null,
          isUpdatingMetamaskNotificationsAccount: Array.from(uniqueAccounts),
        },
      };
    }
    case ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE: {
      return {
        ...state,
        notificationsSettings: {
          ...state,
          loading: false,
          error: action.error,
          isUpdatingMetamaskNotificationsAccount:
            state.notificationsSettings.isUpdatingMetamaskNotificationsAccount,
        },
      };
    }
  }
};

export default notificationReducer;
