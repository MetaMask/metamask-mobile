import { addHexPrefix, toChecksumAddress, BN } from 'ethereumjs-util';
import { rawEncode, rawDecode } from 'ethereumjs-abi';
import Engine from '../core/Engine';
import { strings } from '../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress } from './address';
import { util } from '@metamask/controllers';
import { hexToBN } from './number';
import AppConstants from '../core/AppConstants';
const { SAI_ADDRESS } = AppConstants;

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

export const TRANSACTION_TYPES = {
	PAYMENT_CHANNEL_DEPOSIT: 'payment_channel_deposit',
	PAYMENT_CHANNEL_WITHDRAW: 'payment_channel_withdraw',
	PAYMENT_CHANNEL_SENT: 'payment_channel_sent',
	PAYMENT_CHANNEL_RECEIVED: 'payment_channel_received',
	SENT: 'transaction_sent',
	SENT_TOKEN: 'transaction_sent_token',
	SENT_COLLECTIBLE: 'transaction_sent_collectible',
	RECEIVED: 'transaction_received',
	RECEIVED_TOKEN: 'transaction_received_token',
	RECEIVED_COLLECTIBLE: 'transaction_received_collectible',
	SITE_INTERACTION: 'transaction_site_interaction',
	APPROVE: 'transaction_approve'
};

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
 * Generates ERC20 approve data
 *
 * @param {object} opts - Object containing spender address and value
 * @returns {String} - String containing the generated approce data
 */
export function generateApproveData(opts) {
	if (!opts.spender || !opts.value) {
		throw new Error(`[transactions] 'spender' and 'value' must be defined for 'type' approve`);
	}
	return (
		APPROVE_FUNCTION_SIGNATURE +
		Array.prototype.map
			.call(rawEncode(['address', 'uint256'], [opts.spender, addHexPrefix(opts.value)]), x =>
				('00' + x.toString(16)).slice(-2)
			)
			.join('')
	);
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
	if (!address) return false;
	address = toChecksumAddress(address);
	// If in contract map we don't need to cache it
	if (contractMap[address]) {
		return Promise.resolve(true);
	}
	const { TransactionController } = Engine.context;
	const code = address ? await TransactionController.query('getCode', [address]) : undefined;
	const isSmartContract = util.isSmartContractCode(code);
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
	const { transaction: { data, to } = {} } = transaction;
	if (!to) return CONTRACT_METHOD_DEPLOY;
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
	if (tx && tx.isTransfer) {
		const selfSent = safeToChecksumAddress(tx.transaction.from) === selectedAddress;
		const translationKey = selfSent ? 'transactions.self_sent_unit' : 'transactions.received_unit';
		// Third party sending wrong token symbol
		if (tx.transferInformation.contractAddress === SAI_ADDRESS.toLowerCase()) tx.transferInformation.symbol = 'SAI';
		return strings(translationKey, { unit: tx.transferInformation.symbol });
	}

	const actionKey = await getTransactionActionKey(tx);

	if (actionKey === SEND_ETHER_ACTION_KEY) {
		ticker = paymentChannelTransaction ? strings('unit.sai') : ticker;
		const incoming = safeToChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && safeToChecksumAddress(tx.transaction.from) === selectedAddress;
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

/**
 * Select the correct tx recipient name from available data
 *
 * @param {object} config
 * @param {object} config.addressBook - Object of address book entries
 * @param {string} config.network - network id
 * @param {string} config.toAddress - hex address of tx recipient
 * @param {object} config.identities - object of identities
 * @param {string} config.ensRecipient - name of ens recipient
 * @returns {string} - recipient name
 */
export function getTransactionToName({ addressBook, network, toAddress, identities, ensRecipient }) {
	if (ensRecipient) {
		return ensRecipient;
	}

	const networkAddressBook = addressBook[network];
	const checksummedToAddress = toChecksumAddress(toAddress);

	const transactionToName =
		(networkAddressBook &&
			networkAddressBook[checksummedToAddress] &&
			networkAddressBook[checksummedToAddress].name) ||
		(identities[checksummedToAddress] && identities[checksummedToAddress].name);

	return transactionToName;
}

/**
 * Validate transaction value for speed up or cancel transaction actions
 *
 * @param {object} transaction - Transaction object to validate
 * @param {string} rate - Rate to validate
 * @param {string} accounts - Map of accounts to information objects including balances
 * @returns {string} - Whether the balance is validated or not
 */
export function validateTransactionActionBalance(transaction, rate, accounts) {
	try {
		const checksummedFrom = safeToChecksumAddress(transaction.transaction.from);
		const balance = accounts[checksummedFrom].balance;
		return hexToBN(balance).lt(
			hexToBN(transaction.transaction.gasPrice)
				.mul(new BN(rate * 10))
				.div(new BN(10))
				.mul(hexToBN(transaction.transaction.gas))
				.add(hexToBN(transaction.transaction.value))
		);
	} catch (e) {
		return false;
	}
}

export function getNormalizedTxState(state) {
	return { ...state.transaction, ...state.transaction.transaction };
}

export const getActiveTabUrl = ({ browser = {} }) =>
	browser.tabs && browser.activeTab && browser.tabs.find(({ id }) => id === browser.activeTab)?.url;
