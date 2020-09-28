export function setSearchEngine(searchEngine) {
	return {
		type: 'SET_SEARCH_ENGINE',
		searchEngine
	};
}

export function setShowHexData(showHexData) {
	return {
		type: 'SET_SHOW_HEX_DATA',
		showHexData
	};
}

export function setLockTime(lockTime) {
	return {
		type: 'SET_LOCK_TIME',
		lockTime
	};
}

export function setPrimaryCurrency(primaryCurrency) {
	return {
		type: 'SET_PRIMARY_CURRENCY',
		primaryCurrency
	};
}

export function setEnablePaymentChannels(paymentChannelsEnabled) {
	return {
		type: 'SET_ENABLE_PAYMENT_CHANNELS',
		paymentChannelsEnabled
	};
}

export function setUseBlockieIcon(useBlockieIcon) {
	return {
		type: 'SET_USE_BLOCKIE_ICON',
		useBlockieIcon
	};
}
