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
	switch (action.type) {
		case 'SHOW_TRANSACTION_NOTIFICATION':
			return {
				notifications: enqueue(state.notifications, {
					id: action.transaction.id,
					type: TRANSACTION,
					isVisible: true,
					autodismiss: action.autodismiss || 5000,
					transaction: action.transaction,
					status: action.status
				})
			};
		case 'HIDE_TRANSACTION_NOTIFICATION':
			if (state.notifications[0]) state.notifications[0].isVisible = false;
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
					id: Date.now(),
					type: SIMPLE,
					isVisible: true,
					autodismiss: action.autodismiss || 5000,
					title: action.title,
					description: action.description,
					status: action.status
				})
			};
		}
		default:
			return state;
	}
};
export default notificationReducer;
