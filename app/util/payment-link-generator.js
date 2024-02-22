import { build } from 'eth-url-parser';
import AppConstants from '../core/AppConstants';

/**
 * Generate a universal link / app link based on EIP-681 / EIP-831 URLs
 *
 * @param {string} address - Ethereum address
 *
 * @returns Payment request universal link / app link
 */
export function generateUniversalLinkAddress(address) {
  return `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/send/${address}`;
}

/**
 * Generate a universal link / app link based on EIP-681 / EIP-831 URLs
 *
 * @param {string} ethereum_link - EIP-681 / EIP-831 compatible url
 *
 * @returns Payment request universal link / app link
 */
export function generateUniversalLinkRequest(ethereum_link) {
  const universal_link_format = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/send/`;
  return ethereum_link.replace('ethereum:', universal_link_format);
}

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
      value,
    },
    scheme: 'ethereum',
    target_address: receiverAddress,
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
export function generateERC20Link(
  receiverAddress,
  assetAddress,
  value,
  chainId,
) {
  const data = {
    chain_id: chainId,
    function_name: 'transfer',
    parameters: {
      address: receiverAddress,
      uint256: value,
    },
    scheme: 'ethereum',
    target_address: assetAddress,
  };
  return build(data);
}
