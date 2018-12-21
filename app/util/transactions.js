import { addHexPrefix } from 'ethereumjs-util';
import { rawEncode } from 'ethereumjs-abi';

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
 * Generates transfer data for specified asset
 *
 * @param {string} assetType - Asset type (ERC20)
 * @param {object} opts - Optional asset parameters
 * @returns {string} - String containing the generated transfer data
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
