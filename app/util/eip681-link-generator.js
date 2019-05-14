import { build } from 'eth-url-parser';

/**
 * Generate ETH payment request link
 *
 * @param {string} receiverAddress - Receiver address
 * @param {string} value - Value to request, in float number
 * @param {string} chainId - Chain id
 *
 * @returns Payment request link, it could throw if errors are found
 */
export function generateETHLink(receiverAddress, value, chainId) {
	const data = {
		chain_id: chainId,
		function_name: undefined,
		parameters: {
			value: value + 'e18'
		},
		scheme: 'ethereum',
		target_address: receiverAddress
	};
	return build(data);
}

/**
 * Generate ERC asset payment request link
 *
 * @param {string} receiverAddress - Receiver address
 * @param {string} assetAddress - ERC20 asset address
 * @param {string} value  - Value to request, in float number
 * @param {string} chainId - Chain id
 *
 * @returns Payment request link, it could throw if errors are found
 */
export function generateERC20Link(receiverAddress, assetAddress, value, chainId) {
	const data = {
		chain_id: chainId,
		function_name: 'transfer',
		parameters: {
			address: receiverAddress,
			uint256: value
		},
		scheme: 'ethereum',
		target_address: assetAddress
	};
	return build(data);
}
