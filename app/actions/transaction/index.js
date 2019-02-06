/**
 * Clears transaction object completely
 */
export function newTransaction() {
	return {
		type: 'NEW_TRANSACTION'
	};
}

export function setSelectedAsset(asset) {
	return {
		type: 'SET_SELECTED_ASSET',
		asset
	};
}

/**
 * Sets any attribute in transaction object
 *
 * @param {object} transaction - New transaction object
 */
export function setTransactionObject(transaction) {
	return {
		type: 'SET_TRANSACTION_OBJECT',
		transaction
	};
}

/**
 * Enable selectable tokens (ERC20 and Ether) to send in a transaction
 */
export function setTokensTransaction() {
	return {
		type: 'SET_TOKENS_TRANSACTION'
	};
}

/**
 * Enable Ether only to send in a transaction
 */
export function setEtherTransaction() {
	return {
		type: 'SET_ETHER_TRANSACTION'
	};
}

/**
 * Enable individual ERC20 asset only to send in a transaction
 *
 * @param {object} token - Token object to be sent
 */
export function setIndividualTokenTransaction(token) {
	return {
		type: 'SET_INDIVIDUAL_TOKEN_TRANSACTION',
		token
	};
}

/**
 * Enable individual ERC721 asset only to send in a transaction
 *
 * @param {object} collectible - Collectible object to be sent
 */
export function setIndividualCollectibleTransaction(collectible) {
	return {
		type: 'SET_INDIVIDUAL_COLLECTIBLE_TRANSACTION',
		collectible
	};
}

/**
 * Enable selectable ERC721 assets who's current account is owner of a specific contract to be sent in a transaction
 *
 * @param {object} contractCollectible - Contract collectible object to be sent
 */
export function setContractCollectibleTransaction(contractCollectible) {
	return {
		type: 'SET_CONTRACT_COLLECTIBLE_TRANSACTION',
		contractCollectible
	};
}
