import { addHexPrefix, toChecksumAddress } from 'ethereumjs-util';
import { rawEncode, rawDecode } from 'ethereumjs-abi';
import Engine from '../core/Engine';
import { strings } from '../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress } from './address';
import { util } from 'gaba';
import InstaPay from '../core/InstaPay';

export const TOKEN_METHOD_TRANSFER = 'transfer';
export const TOKEN_METHOD_APPROVE = 'approve';
export const TOKEN_METHOD_TRANSFER_FROM = 'transferfrom';
export const CONTRACT_METHOD_DEPLOY = 'deploy';
export const CONNEXT_METHOD_DEPOSIT = 'connextdeposit';

export const SEND_ETHER_ACTION_KEY = 'sentEther';
export const DEPLOY_CONTRACT_ACTION_KEY = 'deploy';
export const APPROVE_ACTION_KEY = 'approve';
export const SEND_TOKEN_ACTION_KEY = 'transfer';
export const TRANSFER_FROM_ACTION_KEY = 'transferfrom';
export const UNKNOWN_FUNCTION_KEY = 'unknownFunction';
export const SMART_CONTRACT_INTERACTION_ACTION_KEY = 'smartContractInteraction';
export const CONNEXT_DEPOSIT_ACTION_KEY = 'connextdeposit';

export const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';
export const TRANSFER_FROM_FUNCTION_SIGNATURE = '0x23b872dd';
export const APPROVE_FUNCTION_SIGNATURE = '0x095ea7b3';
export const CONNEXT_DEPOSIT = '0xea682e37';
export const CONTRACT_CREATION_SIGNATURE = '0x60a060405260046060527f48302e31';

/**
 * Utility class with the single responsibility
 * of caching CollectibleAddresses
 */
class CollectibleAddresses {
	static cache = {};
}

/**
 * Object containing all known action keys, to be used in transaction review
 */
const reviewActionKeys = {
	[SEND_TOKEN_ACTION_KEY]: strings('transactions.tx_review_transfer'),
	[SEND_ETHER_ACTION_KEY]: strings('transactions.tx_review_confirm'),
	[DEPLOY_CONTRACT_ACTION_KEY]: strings('transactions.tx_review_contract_deployment'),
	[TRANSFER_FROM_ACTION_KEY]: strings('transactions.tx_review_transfer_from'),
	[SMART_CONTRACT_INTERACTION_ACTION_KEY]: strings('transactions.tx_review_unknown'),
	[APPROVE_ACTION_KEY]: strings('transactions.tx_review_approve'),
	[CONNEXT_DEPOSIT_ACTION_KEY]: strings('transactions.tx_review_instant_payment_deposit')
};

/**
 * Object containing all known action keys, to be used in transactions list
 */
const actionKeys = {
	[SEND_TOKEN_ACTION_KEY]: strings('transactions.sent_tokens'),
	[TRANSFER_FROM_ACTION_KEY]: strings('transactions.sent_collectible'),
	[DEPLOY_CONTRACT_ACTION_KEY]: strings('transactions.contract_deploy'),
	[SMART_CONTRACT_INTERACTION_ACTION_KEY]: strings('transactions.smart_contract_interaction'),
	[APPROVE_ACTION_KEY]: strings('transactions.approve'),
	[CONNEXT_DEPOSIT_ACTION_KEY]: strings('transactions.instant_payment_deposit')
};

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
				parseInt(encodedAmount, 16).toString(),
				encodedAmount
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
export async function getMethodData(data) {
	if (data.length < 10) return {};
	const fourByteSignature = data.substr(0, 10);
	if (fourByteSignature === TRANSFER_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_TRANSFER };
	} else if (fourByteSignature === TRANSFER_FROM_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_TRANSFER_FROM };
	} else if (fourByteSignature === APPROVE_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_APPROVE };
	} else if (fourByteSignature === CONNEXT_DEPOSIT) {
		return { name: CONNEXT_METHOD_DEPOSIT };
	} else if (data.substr(0, 32) === CONTRACT_CREATION_SIGNATURE) {
		return { name: CONTRACT_METHOD_DEPLOY };
	}
	const { TransactionController } = Engine.context;
	// If it's a new method, use on-chain method registry
	try {
		const registryObject = await TransactionController.handleMethodData(fourByteSignature);
		if (registryObject) {
			return registryObject.parsedRegistryMethod;
		}
	} catch (e) {
		// Ignore and return empty object
	}
	return {};
}

/**
 * Returns wether the given address is a contract
 *
 * @param {string} address - Ethereum address
 * @returns {boolean} - Whether the given address is a contract
 */
export async function isSmartContractAddress(address) {
	if (address && address.startsWith('0x')) {
		address = toChecksumAddress(address);
		// If in contract map we already know
		if (contractMap[address]) {
			return Promise.resolve(true);
		}
		const { TransactionController } = Engine.context;
		const code = address ? await TransactionController.query('getCode', [address]) : undefined;
		const isSmartContract = util.isSmartContractCode(code);
		return isSmartContract;
	}
	return false;
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
	const { transaction: { data, to } = {} } = transaction;

	if (!to) {
		if (!transaction.paymentChannelTransaction) {
			return CONTRACT_METHOD_DEPLOY;
		}
		return SEND_ETHER_ACTION_KEY;
	}

	if (to && to.toLowerCase() === InstaPay.getDepositAddress().toLowerCase()) {
		return CONNEXT_DEPOSIT_ACTION_KEY;
	}

	let ret;
	// if data in transaction try to get method data
	if (data && data !== '0x') {
		const methodData = await getMethodData(data);
		const { name } = methodData;
		if (name) return name;
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
	return ret;
}

/**
 * Returns corresponding transaction type message to show in UI
 *
 * @param {object} tx - Transaction object
 * @param {string} selectedAddress - Current account public address
 * @param {bool} paymentChannelTransaction - Whether is a payment channel transaction
 * @returns {string} - Transaction type message
 */
export async function getActionKey(tx, selectedAddress, ticker, paymentChannelTransaction) {
	const actionKey = await getTransactionActionKey(tx);
	const selectedAddressToUse = safeToChecksumAddress(
		(paymentChannelTransaction && tx.transaction.paymentChannelAddress) || selectedAddress
	);

	if (actionKey === SEND_ETHER_ACTION_KEY) {
		ticker = paymentChannelTransaction ? strings('unit.dai') : ticker;
		if (tx.transaction.to) {
			const incoming =
				tx.transaction.to && paymentChannelTransaction
					? safeToChecksumAddress(tx.transaction.to) === selectedAddressToUse
					: safeToChecksumAddress(tx.transaction.to) === selectedAddress;
			const selfSent =
				incoming &&
				(paymentChannelTransaction
					? safeToChecksumAddress(tx.transaction.from) === selectedAddressToUse
					: safeToChecksumAddress(tx.transaction.from) === selectedAddress);
			return incoming
				? selfSent
					? ticker
						? strings('transactions.self_sent_unit', { unit: ticker })
						: strings('transactions.self_sent_ether')
					: ticker
					? strings('transactions.received_unit', { unit: ticker })
					: strings('transactions.received_ether')
				: ticker
				? strings('transactions.sent_unit', { unit: ticker })
				: strings('transactions.sent_ether');
		}

		return ticker ? strings('transactions.sent_unit', { unit: ticker }) : strings('transactions.sent_ether');
	}
	const transactionActionKey = actionKeys[actionKey];
	if (transactionActionKey) {
		return transactionActionKey;
	}
	return actionKey;
}

/**
 * Returns corresponding transaction function type
 *
 * @param {object} tx - Transaction object
 * @returns {string} - Transaction function type
 */
export async function getTransactionReviewActionKey(transaction) {
	const actionKey = await getTransactionActionKey({ transaction });
	const transactionReviewActionKey = reviewActionKeys[actionKey];
	if (transactionReviewActionKey) {
		return transactionReviewActionKey;
	}
	return actionKey;
}

/**
 * Returns corresponding ticker, defined or ETH
 *
 * @param {string} - Ticker
 * @returns {string} - Corresponding ticker or ETH
 */
export function getTicker(ticker) {
	return ticker || strings('unit.eth');
}

/**
 * Construct ETH asset object
 *
 * @param {string} ticker - Ticker
 * @returns {object} - ETH object
 */
export function getEther(ticker) {
	return {
		name: 'Ether',
		address: '',
		symbol: ticker || strings('unit.eth'),
		logo: '../images/eth-logo.png',
		isETH: true
	};
}
