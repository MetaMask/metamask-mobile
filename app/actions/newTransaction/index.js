/**
 * Clears transaction object completely
 */
export function newTransaction() {
	return {
		type: 'NEW_TRANSACTION'
	};
}

/**
 * Sets transaction to address and ensRecipient in case is available
 */
export function setRecipient(from, to, ensRecipient) {
	return {
		type: 'SET_RECIPIENT',
		from,
		to,
		ensRecipient
	};
}

export function setSelectedAsset(selectedAsset) {
	return {
		type: 'SET_SELECTED_ASSET',
		selectedAsset
	};
}
