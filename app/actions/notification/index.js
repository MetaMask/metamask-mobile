export function hideTransactionNotification() {
	return {
		type: 'HIDE_TRANSACTION_NOTIFICATION'
	};
}

export function hideNotificationById(id) {
	return {
		type: 'HIDE_NOTIFICATION_BY_ID',
		id
	};
}

export function modifyOrShowTransactionNotificationById({ autodismiss, transaction, status }) {
	return {
		type: 'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION',
		autodismiss,
		transaction,
		status
	};
}

export function modifyOrShowSimpleNotificationById({ autodismiss, title, description, status }) {
	return {
		type: 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION',
		autodismiss,
		title,
		description,
		status
	};
}

export function replaceTransactionNotificationById(notification) {
	return {
		type: 'REPLACE_NOTIFICATION_BY_ID',
		notification
	};
}

export function removeCurrentNotification() {
	return {
		type: 'REMOVE_CURRENT_NOTIFICATION'
	};
}

export function showSimpleNotification({ autodismiss, title, description, status }) {
	return {
		type: 'SHOW_SIMPLE_NOTIFICATION',
		autodismiss,
		title,
		description,
		status
	};
}

export function showTransactionNotification({ autodismiss, transaction, status }) {
	return {
		type: 'SHOW_TRANSACTION_NOTIFICATION',
		autodismiss,
		transaction,
		status
	};
}
