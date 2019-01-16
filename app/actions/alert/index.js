export function dismissAlert() {
	return {
		type: 'HIDE_ALERT'
	};
}

export function showAlert({ isVisible, autodismiss, content }) {
	return {
		type: 'SHOW_ALERT',
		isVisible,
		autodismiss,
		content
	};
}
