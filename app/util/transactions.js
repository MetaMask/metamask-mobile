import { addHexPrefix, toChecksumAddress } from 'ethereumjs-util';
import { rawEncode, rawDecode } from 'ethereumjs-abi';
import Engine from '../core/Engine';
import { strings } from '../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import { isSmartContractCode } from 'gaba/util';

export const TOKEN_METHOD_TRANSFER = 'transfer';
export const TOKEN_METHOD_APPROVE = 'approve';
export const TOKEN_METHOD_TRANSFER_FROM = 'transferfrom';
export const CONTRACT_METHOD_DEPLOY = 'deploy';

export const SEND_ETHER_ACTION_KEY = 'sentEther';
export const DEPLOY_CONTRACT_ACTION_KEY = 'contractDeployment';
export const APPROVE_ACTION_KEY = 'approve';
export const SEND_TOKEN_ACTION_KEY = 'sentTokens';
export const TRANSFER_FROM_ACTION_KEY = 'transferFrom';
export const UNKNOWN_FUNCTION_KEY = 'unknownFunction';
export const SMART_CONTRACT_INTERACTION_ACTION_KEY = 'smartContractInteraction';

export const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';
export const TRANSFER_FROM_FUNCTION_SIGNATURE = '0x23b872dd';
export const CONTRACT_CREATION_SIGNATURE = '0x60a060405260046060527f48302e31';

/**
 * Utility class with the single responsibility
 * of caching ActionKeys
 */
class ActionKeys {
	static cache = {};
}

/**
 * Utility class with the single responsibility
 * of caching CollectibleAddresses
 */
class CollectibleAddresses {
	static cache = {};
}

/**
 * Generates transfer data for specified method
 *
 * @param {String} type - Method to use to generate data
 * @param {Object} opts - Optional asset parameters
 * @returns {String} - String containing the generated transfer data
 */
export function generateTransferData(type, opts) {
	if (!type) {
		throw new Error('[transactions] type must be defined');
	}
	switch (type) {
		case 'transfer':
			if (!opts.toAddress || !opts.amount) {
				throw new Error(`[transactions] 'toAddress' and 'amount' must be defined for 'type' transfer`);
			}
			return (
				TRANSFER_FUNCTION_SIGNATURE +
				Array.prototype.map
					.call(rawEncode(['address', 'uint256'], [opts.toAddress, addHexPrefix(opts.amount)]), x =>
						('00' + x.toString(16)).slice(-2)
					)
					.join('')
			);
		case 'transferFrom':
			return (
				TRANSFER_FROM_FUNCTION_SIGNATURE +
				Array.prototype.map
					.call(
						rawEncode(
							['address', 'address', 'uint256'],
							[opts.fromAddress, opts.toAddress, addHexPrefix(opts.tokenId)]
						),
						x => ('00' + x.toString(16)).slice(-2)
					)
					.join('')
			);
	}
}

/**
 * Decode transfer data for specified method data
 *
 * @param {String} type - Method to use to generate data
 * @param {String} data - Data to decode
 * @returns {Object} - Object containing the decoded transfer data
 */
export function decodeTransferData(type, data) {
	switch (type) {
		case 'transfer': {
			const encodedAddress = data.substr(10, 64);
			const encodedAmount = data.substr(74, 138);
			const bufferEncodedAddress = rawEncode(['address'], [addHexPrefix(encodedAddress)]);
			return [
				addHexPrefix(rawDecode(['address'], bufferEncodedAddress)[0]),
				parseInt(encodedAmount, 16).toString()
			];
		}
		case 'transferFrom': {
			const encodedFromAddress = data.substr(10, 64);
			const encodedToAddress = data.substr(74, 64);
			const encodedTokenId = data.substr(138, 64);
			const bufferEncodedFromAddress = rawEncode(['address'], [addHexPrefix(encodedFromAddress)]);
			const bufferEncodedToAddress = rawEncode(['address'], [addHexPrefix(encodedToAddress)]);
			return [
				addHexPrefix(rawDecode(['address'], bufferEncodedFromAddress)[0]),
				addHexPrefix(rawDecode(['address'], bufferEncodedToAddress)[0]),
				parseInt(encodedTokenId, 16).toString()
			];
		}
	}
}

/**
 * Returns method data object for a transaction dat
 *
 * @param {string} data - Transaction data
 * @returns {object} - Method data object containing the name if is valid
 */
export function getMethodData(data) {
	// TODO use eth-method-registry from GABA
	if (data.substr(0, 10) === TRANSFER_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_TRANSFER };
	} else if (data.substr(0, 10) === TRANSFER_FROM_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_TRANSFER_FROM };
	} else if (data.substr(0, 32) === CONTRACT_CREATION_SIGNATURE) {
		return { name: CONTRACT_METHOD_DEPLOY };
	}
	return {};
}

/**
 * Returns wether the given address is a contract
 *
 * @param {string} address - Ethereum address
 * @returns {boolean} - Wether the given address is a contract
 */
export async function isSmartContractAddress(address) {
	address = toChecksumAddress(address);
	// If in contract map we don't need to cache it
	if (contractMap[address]) {
		return Promise.resolve(true);
	}
	const { TransactionController } = Engine.context;
	const code = address ? await TransactionController.query('getCode', [address]) : undefined;
	const isSmartContract = isSmartContractCode(code);
	return isSmartContract;
}

/**
 * Returns wether the given address is an ERC721 contract
 *
 * @param {string} address - Ethereum address
 * @param {string} tokenId - A possible collectible id
 * @returns {boolean} - Wether the given address is an ERC721 contract
 */
export async function isCollectibleAddress(address, tokenId) {
	const cache = CollectibleAddresses.cache[address];
	if (cache) {
		return Promise.resolve(cache);
	}
	const { AssetsContractController } = Engine.context;
	// Hack to know if the address is a collectible smart contract
	// for now this method is called from tx element so we have the respective 'tokenId'
	const ownerOf = await AssetsContractController.getOwnerOf(address, tokenId);
	const isCollectibleAddress = ownerOf && ownerOf !== '0x';
	CollectibleAddresses.cache[address] = isCollectibleAddress;
	return isCollectibleAddress;
}

/**
 * Returns corresponding transaction action key
 *
 * @param {object} transaction - Transaction object
 * @returns {string} - Corresponding transaction action key
 */
export async function getTransactionActionKey(transaction) {
	const { transactionHash, transaction: { data, to } = {} } = transaction;
	const cache = ActionKeys.cache[transactionHash];
	if (transactionHash && cache) {
		return Promise.resolve(cache);
	}
	let ret;
	// if data in transaction try to get method data
	if (data && data !== '0x') {
		const methodData = getMethodData(data);
		const { name } = methodData;
		const methodName = name && name.toLowerCase();
		switch (methodName) {
			case TOKEN_METHOD_TRANSFER:
				ret = SEND_TOKEN_ACTION_KEY;
				break;
			case TOKEN_METHOD_APPROVE:
				ret = APPROVE_ACTION_KEY;
				break;
			case TOKEN_METHOD_TRANSFER_FROM:
				ret = TRANSFER_FROM_ACTION_KEY;
				break;
			case CONTRACT_METHOD_DEPLOY:
				ret = DEPLOY_CONTRACT_ACTION_KEY;
				break;
		}
		if (ret) {
			ActionKeys.cache[transactionHash] = ret;
			return ret;
		}
	}
	const toSmartContract =
		transaction.toSmartContract !== undefined ? transaction.toSmartContract : await isSmartContractAddress(to);
	if (toSmartContract) {
		// There is no data or unknown method data, if is smart contract
		ret = SMART_CONTRACT_INTERACTION_ACTION_KEY;
	} else {
		// If there is no data and no smart contract interaction
		ret = SEND_ETHER_ACTION_KEY;
	}
	ActionKeys.cache[transactionHash] = ret;
	return ret;
}

/**
 * Returns corresponding transaction type message to show in UI
 *
 * @param {object} tx - Transaction object
 * @param {selectedAddress} selectedAddress - Current account public address
 * @returns {string} - Transaction type message
 */
export async function getActionKey(tx, selectedAddress) {
	const actionKey = await getTransactionActionKey(tx);
	const incoming = toChecksumAddress(tx.transaction.to) === toChecksumAddress(selectedAddress);
	const selfSent = incoming && toChecksumAddress(tx.transaction.from) === toChecksumAddress(selectedAddress);
	switch (actionKey) {
		case SEND_TOKEN_ACTION_KEY:
			return strings('transactions.sent_tokens');
		case TRANSFER_FROM_ACTION_KEY:
			return strings('transactions.sent_collectible');
		case SEND_ETHER_ACTION_KEY:
			return incoming
				? selfSent
					? strings('transactions.self_sent_ether')
					: strings('transactions.received_ether')
				: strings('transactions.sent_ether');
		case DEPLOY_CONTRACT_ACTION_KEY:
			return strings('transactions.contract_deploy');
		case SMART_CONTRACT_INTERACTION_ACTION_KEY:
			return strings('transactions.smart_contract_interaction');
		default:
			return strings('transactions.smart_contract_interaction');
	}
}

/**
 * Returns corresponding transaction function type
 *
 * @param {object} tx - Transaction object
 * @returns {string} - Transaction function type
 */
export async function getTransactionReviewActionKey(transaction) {
	const actionKey = await getTransactionActionKey({ transaction });
	switch (actionKey) {
		case SEND_TOKEN_ACTION_KEY:
			return strings('transactions.tx_review_transfer');
		case SEND_ETHER_ACTION_KEY:
			return strings('transactions.tx_review_confirm');
		case DEPLOY_CONTRACT_ACTION_KEY:
			return strings('transactions.tx_review_contract_deployment');
		case TRANSFER_FROM_ACTION_KEY:
			return strings('transactions.tx_review_transfer_from');
		case SMART_CONTRACT_INTERACTION_ACTION_KEY:
			return strings('transactions.tx_review_confirm');
		default:
			return strings('transactions.tx_review_unknown');
	}
}
