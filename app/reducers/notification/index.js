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

const enqueue = (notifications, notification) => {
	notifications.push(notification);
	return notifications;
};
const dequeue = notifications => {
	notifications.shift();
	return notifications;
};
export const currentNotificationSelector = state => state?.notifications[0] || {};

const notificationReducer = (state = initialState, action) => {
	let index = 0;
	switch (action.type) {
		// make current notification isVisible props false
		case ACTIONS.HIDE_CURRENT_NOTIFICATION:
			if (state.notifications[0]) state.notifications[0].isVisible = false;
			return {
				notifications: [...state.notifications]
			};
		case ACTIONS.HIDE_NOTIFICATION_BY_ID:
			index = state.notifications.findIndex(({ id }) => id === action.id);
			state.notifications[index].isVisible = false;
			return {
				notifications: [...state.notifications]
			};
		case ACTIONS.MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION:
			index = state.notifications.findIndex(({ id }) => id === action.id);
			if (index >= 0) {
				state.notifications[index].isVisible = false;
				return {
					notifications: [...state.notifications]
				};
			}
			return {
				notifications: enqueue(state.notifications, {
					id: action.transaction.id,
					isVisible: true,
					autodismiss: action.autodismiss,
					transaction: action.transaction,
					status: action.status,
					type: TRANSACTION
				})
			};
		case ACTIONS.MODIFY_OR_SHOW_SIMPLE_NOTIFICATION:
			index = state.notifications.findIndex(({ id }) => id === action.id);
			if (index >= 0) {
				state.notifications[index].isVisible = false;
				return {
					notifications: [...state.notifications]
				};
			}
			return {
				notifications: enqueue(state.notifications, {
					id: action.id,
					isVisible: true,
					autodismiss: action.autodismiss,
					title: action.title,
					description: action.description,
					status: action.status,
					type: SIMPLE
				})
			};
		case ACTIONS.REPLACE_NOTIFICATION_BY_ID:
			index = state.notifications.findIndex(({ id }) => id === action.id);
			state.notifications[index] = action.notification;
			return {
				notifications: [...state.notifications]
			};
		case ACTIONS.REMOVE_NOTIFICATION_BY_ID:
			index = state.notifications.findIndex(({ id }) => id === action.id);
			if (index > 0) state.notifications.splice(index);
			return {
				notifications: [...state.notifications]
			};
		case ACTIONS.REMOVE_CURRENT_NOTIFICATION:
			return {
				notifications: dequeue(state.notifications)
			};
		case ACTIONS.SHOW_SIMPLE_NOTIFICATION: {
			return {
				notifications: enqueue(state.notifications, {
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
		case ACTIONS.SHOW_TRANSACTION_NOTIFICATION:
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
		default:
			return state;
	}
};
export default notificationReducer;
