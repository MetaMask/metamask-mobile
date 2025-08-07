import {
  BASE_MAINNET_BLOCK_EXPLORER,
  LINEA_GOERLI_BLOCK_EXPLORER,
  LINEA_MAINNET_BLOCK_EXPLORER,
  LINEA_SEPOLIA_BLOCK_EXPLORER,
  SEPOLIA_BLOCK_EXPLORER,
} from '../constants/urls';
import {
  LINEA_GOERLI,
  LINEA_MAINNET,
  LINEA_SEPOLIA,
  BASE_MAINNET,
  MAINNET,
  SEPOLIA,
} from '../constants/network';

/**
 * Gets the etherscan link for an address in a specific network
 *
 * TODO: Replace this with `@metamask/etherscan-link`
 *
 * @param {networkType} string - name of the network
 * @param {address} string - ethereum address to be used on the link
 * @returns - string
 */
export function getEtherscanAddressUrl(networkType, address) {
  return `${getEtherscanBaseUrl(networkType)}/address/${address}`;
}

/**
 * Gets the etherscan link for a transaction in a specific network
 *
 * TODO: Replace this with `@metamask/etherscan-link`
 *
 * @param {networkType} string - name of the network
 * @param {tx_hash} string - hash of the transaction to be used on the link
 * @returns - string
 */
export function getEtherscanTransactionUrl(networkType, tx_hash) {
  return `${getEtherscanBaseUrl(networkType)}/tx/${tx_hash}`;
}

/**
 * Gets the base etherscan link for a transaction in a specific network
 *
 * TODO: Replace this with `@metamask/etherscan-link`
 *
 * @param {networkType} string - name of the network
 * @returns - string
 */
export function getEtherscanBaseUrl(networkType) {
  if (networkType === LINEA_GOERLI) return LINEA_GOERLI_BLOCK_EXPLORER;
  if (networkType === LINEA_SEPOLIA) return LINEA_SEPOLIA_BLOCK_EXPLORER;
  if (networkType === LINEA_MAINNET) return LINEA_MAINNET_BLOCK_EXPLORER;
  if (networkType === BASE_MAINNET) return BASE_MAINNET_BLOCK_EXPLORER;
  if (networkType === SEPOLIA) return SEPOLIA_BLOCK_EXPLORER;
  const subdomain =
    networkType.toLowerCase() === MAINNET
      ? ''
      : `${networkType.toLowerCase()}.`;
  return `https://${subdomain}etherscan.io`;
}
