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
export function setRecipient(from, to, ensRecipient, transactionToName, transactionFromName) {
	return {
		type: 'SET_RECIPIENT',
		from,
		to,
		ensRecipient,
		transactionToName,
		transactionFromName
	};
}

export function setSelectedAsset(selectedAsset) {
	return {
		type: 'SET_SELECTED_ASSET',
		selectedAsset
	};
}

export function setValue(value) {
	return {
		type: 'SET_VALUE',
		value
	};
}
