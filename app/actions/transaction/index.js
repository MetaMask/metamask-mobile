/**
 * Clears transaction object completely
 */
export function newTransaction() {
	return {
		type: 'NEW_TRANSACTION'
	};
}

/**
 * Sets any attribute in transaction object
 *
 * @param {object} transaction - New transaction object
 */
export function setPaymentChannelTransaction(asset) {
	return {
		type: 'SET_PAYMENT_CHANNEL_TRANSACTION',
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
 *
 * @param {object} asset - Asset to start the transaction with
 */
export function setTokensTransaction(asset) {
	return {
		type: 'SET_TOKENS_TRANSACTION',
		asset
	};
}

/**
 * Enable Ether only to send in a transaction
 *
 * @param {object} transaction - Transaction additional object
 */
export function setEtherTransaction(transaction) {
	return {
		type: 'SET_ETHER_TRANSACTION',
		transaction
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
 * @param {object} collectible - Collectible of the type contract collectible that the user wants to send
 */
export function setCollectibleContractTransaction(collectible) {
	return {
		type: 'SET_COLLECTIBLE_CONTRACT_TRANSACTION',
		collectible
	};
}
