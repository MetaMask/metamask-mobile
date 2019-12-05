/**
 * Clears transaction object completely
 */
export function resetTransaction() {
	return {
		type: 'RESET_TRANSACTION'
	};
}

export function newAssetTransaction(selectedAsset) {
	return {
		type: 'NEW_ASSET_TRANSACTION',
		selectedAsset,
		assetType: selectedAsset.isEth ? 'ETH' : selectedAsset.tokenId ? 'ERC721' : 'ERC20'
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
		selectedAsset,
		assetType: selectedAsset.isEth ? 'ETH' : selectedAsset.tokenId ? 'ERC721' : 'ERC20'
	};
}

export function setValue(value) {
	return {
		type: 'SET_VALUE',
		value
	};
}

export function prepareTransaction(transaction) {
	return {
		type: 'PREPARE_TRANSACTION',
		transaction
	};
}
