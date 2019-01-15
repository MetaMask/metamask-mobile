import { addHexPrefix, toChecksumAddress } from 'ethereumjs-util';
import { rawEncode, rawDecode } from 'ethereumjs-abi';
import Engine from '../core/Engine';
import { strings } from '../../locales/i18n';
import { hexToBN } from './number';

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

export const TOKEN_TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';
export const CONTRACT_CREATION_SIGNATURE = '0x60a060405260046060527f48302e31';

/**
 * Generates transfer data for specified asset type
 *
 * @param {String} assetType - Asset type (ERC20)
 * @param {Object} opts - Optional asset parameters
 * @returns {String} - String containing the generated transfer data
 */
export function generateTransferData(assetType, opts) {
	switch (assetType) {
		case 'ERC20':
			return (
				TOKEN_TRANSFER_FUNCTION_SIGNATURE +
				Array.prototype.map
					.call(rawEncode(['address', 'uint256'], [opts.toAddress, addHexPrefix(opts.amount)]), x =>
						('00' + x.toString(16)).slice(-2)
					)
					.join('')
			);
	}
}

/**
 * Decode transfer data for specified asset type
 *
 * @param {String} assetType - Asset type (ERC20)
 * @param {String} data - Data to decode
 * @returns {Object} - Object containing the decoded transfer data
 */
export function decodeTransferData(assetType, data) {
	let encodedAddress, encodedAmount, bufferEncodedAddress;
	switch (assetType) {
		case 'ERC20':
			encodedAddress = data.substr(10, 64);
			encodedAmount = data.substr(74, 138);
			bufferEncodedAddress = rawEncode(['address'], [addHexPrefix(encodedAddress)]);
			return [addHexPrefix(rawDecode(['address'], bufferEncodedAddress)[0]), hexToBN(encodedAmount)];
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
	if (data.substr(0, 10) === TOKEN_TRANSFER_FUNCTION_SIGNATURE) {
		return { name: TOKEN_METHOD_TRANSFER };
	}
	if (data.substr(0, 32) === CONTRACT_CREATION_SIGNATURE) {
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
	const { TransactionController } = Engine.context;
	const code = address ? await TransactionController.query('getCode', [address]) : undefined;
	// Geth will return '0x', and ganache-core v2.2.1 will return '0x0'
	const codeIsEmpty = !code || code === '0x' || code === '0x0';
	return !codeIsEmpty;
}

/**
 * Returns corresponding transaction action key
 *
 * @param {object} transaction - Transaction object
 * @returns {string} - Corresponding transaction action key
 */
export async function getTransactionActionKey(transaction) {
	const { transaction: { data, to } = {} } = transaction;
	if (data) {
		const methodData = getMethodData(data);
		const toSmartContract = await isSmartContractAddress(to);
		const { name } = methodData;
		const methodName = name && name.toLowerCase();
		switch (methodName) {
			case TOKEN_METHOD_TRANSFER:
				return SEND_TOKEN_ACTION_KEY;
			case TOKEN_METHOD_APPROVE:
				return APPROVE_ACTION_KEY;
			case TOKEN_METHOD_TRANSFER_FROM:
				return TRANSFER_FROM_ACTION_KEY;
		}
		if (!toSmartContract) {
			if (methodName === CONTRACT_METHOD_DEPLOY) {
				return DEPLOY_CONTRACT_ACTION_KEY;
			}
			return SEND_ETHER_ACTION_KEY;
		}
		return UNKNOWN_FUNCTION_KEY;
	}
	return SEND_ETHER_ACTION_KEY;
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
		case SEND_ETHER_ACTION_KEY:
			return incoming
				? selfSent
					? strings('transactions.self_sent_ether')
					: strings('transactions.received_ether')
				: strings('transactions.sent_ether');
		case DEPLOY_CONTRACT_ACTION_KEY:
			return strings('transactions.contract_deploy');
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
		default:
			return strings('transactions.tx_review_unknown');
	}
}
