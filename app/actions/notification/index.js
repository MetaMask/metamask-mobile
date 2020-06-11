export function hideTransactionNotification() {
	return {
		type: 'HIDE_TRANSACTION_NOTIFICATION'
	};
}

export function showTransactionNotification({ autodismiss, transaction, status }) {
	return {
		type: 'SHOW_TRANSACTION_NOTIFICATION',
		isVisible: true,
		autodismiss,
		transaction,
		status
	};
}

export function showSimpleNotification({ autodismiss, title, description, status }) {
	return {
		type: 'SHOW_SIMPLE_NOTIFICATION',
		isVisible: true,
		autodismiss,
		title,
		description,
		status
	};
}
