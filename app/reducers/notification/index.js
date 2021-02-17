import notificationTypes from '../../util/notifications';
const { TRANSACTION, SIMPLE } = notificationTypes;

const initialState = {
	notifications: []
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
		case 'HIDE_TRANSACTION_NOTIFICATION':
			if (state.notifications[0]) state.notifications[0].isVisible = false;
			return {
				notifications: [...state.notifications]
			};
		case 'HIDE_NOTIFICATION_BY_ID':
			index = state.notifications.findIndex(({ id }) => id === action.id);
			state.notifications[index].isVisible = false;
			return {
				notifications: [...state.notifications]
			};
		case 'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION':
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
					autodismiss: action.autodismiss || 5000,
					transaction: action.transaction,
					status: action.status,
					type: TRANSACTION
				})
			};

		case 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION':
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
					autodismiss: action.autodismiss || 5000,
					title: action.title,
					description: action.description,
					status: action.status,
					type: SIMPLE
				})
			};

		case 'REPLACE_NOTIFICATION_BY_ID':
			index = state.notifications.findIndex(({ id }) => id === action.id);
			state.notifications[index] = action.notification;
			return {
				notifications: [...state.notifications]
			};
		case 'REMOVE_CURRENT_NOTIFICATION':
			return {
				notifications: dequeue(state.notifications)
			};
		case 'SHOW_SIMPLE_NOTIFICATION': {
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
		case 'SHOW_TRANSACTION_NOTIFICATION':
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
