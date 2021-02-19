import notificationTypes from '../../util/notifications';
const { TRANSACTION, SIMPLE } = notificationTypes;

export const initialState = {
	notifications: []
};

export const ACTIONS = {
	HIDE_CURRENT_NOTIFICATION: 'HIDE_CURRENT_NOTIFICATION',
	HIDE_NOTIFICATION_BY_ID: 'HIDE_NOTIFICATION_BY_ID',
	MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION: 'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION',
	MODIFY_OR_SHOW_SIMPLE_NOTIFICATION: 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION',
	REPLACE_NOTIFICATION_BY_ID: 'REPLACE_NOTIFICATION_BY_ID',
	REMOVE_NOTIFICATION_BY_ID: 'REMOVE_NOTIFICATION_BY_ID',
	REMOVE_CURRENT_NOTIFICATION: 'REMOVE_CURRENT_NOTIFICATION',
	SHOW_SIMPLE_NOTIFICATION: 'SHOW_SIMPLE_NOTIFICATION',
	SHOW_TRANSACTION_NOTIFICATION: 'SHOW_TRANSACTION_NOTIFICATION'
};

const enqueue = (notifications, notification) => [...notifications, notification];
const dequeue = notifications => notifications.slice(1);

export const currentNotificationSelector = state => state?.notifications[0] || {};

const notificationReducer = (state = initialState, action) => {
	const { notifications } = state;
	switch (action.type) {
		// make current notification isVisible props false
		case ACTIONS.HIDE_CURRENT_NOTIFICATION: {
			if (notifications[0]) {
				return [{ ...notifications[0], isVisible: false }, ...notifications.slice(1)];
			}
			return state;
		}
		case ACTIONS.HIDE_NOTIFICATION_BY_ID: {
			const index = notifications.findIndex(({ id }) => id === action.id);
			if (index === -1) {
				return state;
			}
			return {
				notifications: [
					...notifications.slice(0, index),
					{ ...notifications[index], isVisible: false },
					...notifications.slice(index + 1)
				]
			};
		}
		case ACTIONS.MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION: {
			const index = notifications.findIndex(({ id }) => id === action.id);
			if (index >= 0) {
				return {
					notifications: [
						...notifications.slice(0, index),
						{ ...notifications[index], isVisible: false },
						...notifications.slice(index + 1)
					]
				};
			}
			return {
				notifications: enqueue(notifications, {
					id: action.transaction.id,
					isVisible: true,
					autodismiss: action.autodismiss,
					transaction: action.transaction,
					status: action.status,
					type: TRANSACTION
				})
			};
		}
		case ACTIONS.MODIFY_OR_SHOW_SIMPLE_NOTIFICATION: {
			const index = notifications.findIndex(({ id }) => id === action.id);
			if (index >= 0) {
				return {
					notifications: [
						...notifications.slice(0, index),
						{ ...notifications[index], isVisible: false },
						...notifications.slice(index + 1)
					]
				};
			}
			return {
				notifications: enqueue(notifications, {
					id: action.id,
					isVisible: true,
					autodismiss: action.autodismiss,
					title: action.title,
					description: action.description,
					status: action.status,
					type: SIMPLE
				})
			};
		}
		case ACTIONS.REPLACE_NOTIFICATION_BY_ID: {
			const index = notifications.findIndex(({ id }) => id === action.id);
			if (index === -1) {
				return state;
			}
			return {
				notifications: [
					...notifications.slice(0, index),
					action.notification,
					...notifications.slice(index + 1)
				]
			};
		}
		case ACTIONS.REMOVE_NOTIFICATION_BY_ID: {
			return {
				notifications: notifications.filter(({ id }) => id !== action.id)
			};
		}
		case ACTIONS.REMOVE_CURRENT_NOTIFICATION: {
			return {
				notifications: dequeue(notifications)
			};
		}
		case ACTIONS.SHOW_SIMPLE_NOTIFICATION: {
			return {
				notifications: enqueue(notifications, {
					id: action.id,
					isVisible: true,
					autodismiss: action.autodismiss || 5000,
					title: action.title,
					description: action.description,
					status: action.status,
					type: SIMPLE
				})
			};
		}
		case ACTIONS.SHOW_TRANSACTION_NOTIFICATION: {
			return {
				notifications: enqueue(state.notifications, {
					id: action.transaction.id,
					isVisible: true,
					autodismiss: action.autodismiss || 5000,
					transaction: action.transaction,
					status: action.status,
					type: TRANSACTION
				})
			};
		}
		default:
			return state;
	}
};
export default notificationReducer;
