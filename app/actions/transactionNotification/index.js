export function hideTransactionNotification() {
	return {
		type: 'HIDE_TRANSACTION_NOTIFICATION'
	};
}

export function showTransactionNotification({ autodismiss, transaction, status }) {
	console.log('showTransactionNotification', showTransactionNotification);
	return {
		type: 'SHOW_TRANSACTION_NOTIFICATION',
		isVisible: true,
		autodismiss,
		transaction,
		status
	};
}
