import TransactionTypes from '../../core/TransactionTypes';

const {
  ASSET: { ETH, ERC20, ERC721 },
} = TransactionTypes;

/**
 * Clears transaction object completely
 */
export function resetTransaction() {
  return {
    type: 'RESET_TRANSACTION',
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
    assetType: selectedAsset.isETH
      ? ETH
      : selectedAsset.tokenId
      ? ERC721
      : ERC20,
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
export function setRecipient(
  from,
  to,
  ensRecipient,
  transactionToName,
  transactionFromName,
) {
  return {
    type: 'SET_RECIPIENT',
    from,
    to,
    ensRecipient,
    transactionToName,
    transactionFromName,
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
    assetType: selectedAsset.isETH
      ? ETH
      : selectedAsset.tokenId
      ? ERC721
      : ERC20,
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
    transaction,
  };
}

/**
 * Sets transaction object to be sent. All properties can be updated
 *
 * @param {object} config
 * @param {object} config.transaction - Transaction object with from, to, data, gas, gasPrice, value
 * @param {string} config.ensRecipient - Resolved ens name to send the transaction to
 * @param {string} config.transactionToName - Resolved address book name for to address
 * @param {string} config.transactionFromName - Resolved address book name for from address
 * @param {object} config.selectedAsset - Asset to start the transaction with
 * @param {string} config.assetType - The selectedAsset's type
 */
export function prepareFullTransaction({
  transaction,
  ensRecipient,
  transactionToName,
  transactionFromName,
  selectedAsset,
  assetType,
}) {
  return {
    type: 'PREPARE_FULL_TRANSACTION',
    transaction,
    ensRecipient,
    transactionToName,
    transactionFromName,
    selectedAsset,
    assetType,
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
    transaction,
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
    asset,
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
    transaction,
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
    token,
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
    collectible,
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
    collectible,
  };
}

export function setNonce(nonce) {
  return {
    type: 'SET_NONCE',
    nonce,
  };
}

export function setProposedNonce(proposedNonce) {
  return {
    type: 'SET_PROPOSED_NONCE',
    proposedNonce,
  };
}
