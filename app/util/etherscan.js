import {
  LINEA_GOERLI_BLOCK_EXPLORER,
  LINEA_MAINNET_BLOCK_EXPLORER,
} from '../constants/urls';
import { LINEA_GOERLI, LINEA_MAINNET, MAINNET } from '../constants/network';

/**
 * Gets the etherscan link for an address in a specific network
 *
 * @param {network} string - name of the network
 * @param {address} string - ethereum address to be used on the link
 * @returns - string
 */
export function getEtherscanAddressUrl(network, address) {
  return `${getEtherscanBaseUrl(network)}/address/${address}`;
}

/**
 * Gets the etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @param {tx_hash} string - hash of the transaction to be used on the link
 * @returns - string
 */
export function getEtherscanTransactionUrl(network, tx_hash) {
  return `${getEtherscanBaseUrl(network)}/tx/${tx_hash}`;
}

/**
 * Gets the base etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @returns - string
 */
export function getEtherscanBaseUrl(network) {
  if (network === LINEA_GOERLI) return LINEA_GOERLI_BLOCK_EXPLORER;
  if (network === LINEA_MAINNET) return LINEA_MAINNET_BLOCK_EXPLORER;
  const subdomain =
    network.toLowerCase() === MAINNET ? '' : `${network.toLowerCase()}.`;
  return `https://${subdomain}etherscan.io`;
}
