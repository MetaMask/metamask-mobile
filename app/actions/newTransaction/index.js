import TransactionTypes from '../../core/TransactionTypes';

const {
	ASSET: { ETH, ERC20, ERC721 }
} = TransactionTypes;

/**
 * Clears transaction object completely
 */
export function resetTransaction() {
	return {
		type: 'RESET_TRANSACTION'
	};
}

/**
 * Starts a new transaction state with an asset
 *
 * @param {object} selectedAsset - Asset to start the transaction with
 */
export function newAssetTransaction(selectedAsset) {
	return {
		type: 'NEW_ASSET_TRANSACTION',
		selectedAsset,
		assetType: selectedAsset.isETH ? ETH : selectedAsset.tokenId ? ERC721 : ERC20
	};
}

/**
 * Sets transaction to address and ensRecipient in case is available
 *
 * @param {string} from - Address to send the transaction from
 * @param {string} to - Address to send the transaction to
 * @param {string} ensRecipient - Resolved ens name to send the transaction to
 * @param {string} transactionToName - Resolved address book name for to address
 * @param {string} transactionFromName - Resolved address book name for from address
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

/**
 * Sets asset as selectedAsset
 *
 * @param {object} selectedAsset - Asset to start the transaction with
 */
export function setSelectedAsset(selectedAsset) {
	return {
		type: 'SET_SELECTED_ASSET',
		selectedAsset,
		assetType: selectedAsset.isETH ? ETH : selectedAsset.tokenId ? ERC721 : ERC20
	};
}

/**
 * Sets transaction object to be sent
 *
 * @param {object} transaction - Transaction object with from, to, data, gas, gasPrice, value
 */
export function prepareTransaction(transaction) {
	return {
		type: 'PREPARE_TRANSACTION',
		transaction
	};
}
