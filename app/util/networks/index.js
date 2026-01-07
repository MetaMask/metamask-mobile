import URL from 'url-parse';
import networksWithImages from '.././../images/image-icons';
import {
  MAINNET,
  NETWORKS_CHAIN_ID,
  SEPOLIA,
  RPC,
  LINEA_GOERLI,
  LINEA_MAINNET,
  LINEA_SEPOLIA,
  MEGAETH_TESTNET,
  MONAD_TESTNET,
  BASE_MAINNET,
} from '../../../app/constants/network';
import { NetworkSwitchErrorType } from '../../../app/constants/error';
import {
  BlockExplorerUrl,
  ChainId,
  NetworkType,
  toHex,
} from '@metamask/controller-utils';
import { toLowerCaseEquals } from '../general';
import { fastSplit } from '../number';
import { regex } from '../../../app/util/regex';
import { MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP } from '../../../app/core/Multichain/constants';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from './customNetworks';
import { strings } from '../../../locales/i18n';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
  getEtherscanTransactionUrl,
} from '../etherscan';
import {
  LINEA_FAUCET,
  LINEA_MAINNET_BLOCK_EXPLORER,
  LINEA_SEPOLIA_BLOCK_EXPLORER,
  MAINNET_BLOCK_EXPLORER,
  SEPOLIA_BLOCK_EXPLORER,
  SEPOLIA_FAUCET,
  BASE_MAINNET_BLOCK_EXPLORER,
} from '../../constants/urls';
import { isNonEvmChainId } from '../../core/Multichain/utils';
import { SolScope } from '@metamask/keyring-api';
import { store } from '../../store';
import {
  selectSelectedNonEvmNetworkChainId,
  selectMultichainNetworkControllerState,
} from '../../selectors/multichainNetworkController';
import { formatBlockExplorerAddressUrl } from '../../core/Multichain/networks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';

/**
 * List of the supported networks
 * including name, id, and color
 *
 * This values are used in certain places like
 * navbar and the network switcher.
 */
export const NetworkList = {
  [MAINNET]: {
    name: 'Ethereum Main Network',
    shortName: 'Ethereum',
    networkId: 1,
    chainId: toHex('1'),
    ticker: 'ETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#3cc29e',
    networkType: 'mainnet',
    imageSource: networksWithImages.ETHEREUM,
    blockExplorerUrl: MAINNET_BLOCK_EXPLORER,
    isTestNet: false,
  },
  [LINEA_MAINNET]: {
    name: 'Linea Main Network',
    shortName: 'Linea',
    networkId: 59144,
    chainId: toHex('59144'),
    ticker: 'ETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#121212',
    networkType: 'linea-mainnet',
    imageSource: networksWithImages['LINEA-MAINNET'],
    blockExplorerUrl: LINEA_MAINNET_BLOCK_EXPLORER,
    isTestNet: false,
  },
  [BASE_MAINNET]: {
    name: 'Base Main Network',
    shortName: 'Base',
    networkId: 8453,
    chainId: toHex('8453'),
    ticker: 'ETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#0052FE',
    networkType: 'base-mainnet',
    imageSource: networksWithImages.BASE,
    blockExplorerUrl: BASE_MAINNET_BLOCK_EXPLORER,
    isTestNet: false,
  },
  [SEPOLIA]: {
    name: 'Sepolia',
    shortName: 'Sepolia',
    networkId: 11155111,
    chainId: toHex('11155111'),
    ticker: 'SepoliaETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#cfb5f0',
    networkType: 'sepolia',
    imageSource: networksWithImages.SEPOLIA,
    blockExplorerUrl: SEPOLIA_BLOCK_EXPLORER,
    isTestNet: true,
  },
  [LINEA_SEPOLIA]: {
    name: 'Linea Sepolia',
    shortName: 'Linea Sepolia',
    networkId: 59141,
    chainId: toHex('59141'),
    ticker: 'LineaETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#61dfff',
    networkType: 'linea-sepolia',
    imageSource: networksWithImages['LINEA-SEPOLIA'],
    blockExplorerUrl: LINEA_SEPOLIA_BLOCK_EXPLORER,
    isTestNet: true,
  },
  [MEGAETH_TESTNET]: {
    name: 'Mega Testnet',
    shortName: 'Mega Testnet',
    networkId: 6342,
    chainId: toHex('6342'),
    ticker: 'MegaETH',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#61dfff',
    networkType: 'megaeth-testnet',
    imageSource: networksWithImages['MEGAETH-TESTNET'],
    blockExplorerUrl: BlockExplorerUrl['megaeth-testnet'],
    isTestNet: true,
  },
  [MONAD_TESTNET]: {
    name: 'Monad Testnet',
    shortName: 'Monad Testnet',
    networkId: 10143,
    chainId: toHex('10143'),
    ticker: 'MON',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#61dfff',
    networkType: 'monad-testnet',
    imageSource: networksWithImages['MONAD-TESTNET'],
    blockExplorerUrl: BlockExplorerUrl['monad-testnet'],
    isTestNet: true,
  },
  [RPC]: {
    name: 'Private Network',
    shortName: 'Private',
    // Third party color
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: '#f2f3f4',
    networkType: 'rpc',
  },
};

const NetworkListKeys = Object.keys(NetworkList);

export const BLOCKAID_SUPPORTED_NETWORK_NAMES = {
  [NETWORKS_CHAIN_ID.MAINNET]: 'Ethereum Mainnet',
  [NETWORKS_CHAIN_ID.BSC]: 'Binance Smart Chain',
  [NETWORKS_CHAIN_ID.BASE]: 'Base',
  [NETWORKS_CHAIN_ID.OPTIMISM]: 'Optimism',
  [NETWORKS_CHAIN_ID.POLYGON]: 'Polygon',
  [NETWORKS_CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: 'Linea',
  [NETWORKS_CHAIN_ID.SEPOLIA]: 'Sepolia',
  [NETWORKS_CHAIN_ID.OPBNB]: 'opBNB',
  [NETWORKS_CHAIN_ID.ZKSYNC_ERA]: 'zkSync Era Mainnet',
  [NETWORKS_CHAIN_ID.SCROLL]: 'Scroll',
  [NETWORKS_CHAIN_ID.BERACHAIN]: 'Berachain',
  [NETWORKS_CHAIN_ID.METACHAIN_ONE]: 'Metachain One Mainnet',
  [NETWORKS_CHAIN_ID.SEI]: 'Sei Mainnet',
};

export default NetworkList;

export const getAllNetworks = () =>
  NetworkListKeys.filter((name) => name !== RPC);

export const getMainnetNetworks = () =>
  getAllNetworks().filter((name) => !NetworkList[name].isTestNet);

export const getTestNetworks = () =>
  getAllNetworks().filter((name) => NetworkList[name].isTestNet);

export const isMainnetNetwork = (networkType) =>
  getMainnetNetworks().includes(networkType);

/**
 * Checks if network is default mainnet.
 *
 * @param {string} networkType - Type of network.
 * @returns If the network is default mainnet.
 */
export const isDefaultMainnet = (networkType) => networkType === MAINNET;

/**
 * Check whether the given chain ID is Ethereum Mainnet.
 *
 * @param {string} chainId - The chain ID to check.
 * @returns True if the chain ID is Ethereum Mainnet, false otherwise.
 */
export const isMainNet = (chainId) => chainId === '0x1';

export const isLineaMainnet = (networkType) => networkType === LINEA_MAINNET;
export const isLineaMainnetChainId = (chainId) =>
  chainId === CHAIN_IDS.LINEA_MAINNET;

export const isSolanaMainnet = (chainId) => chainId === SolScope.Mainnet;

/**
 * Converts a hexadecimal or decimal chain ID to a base 10 number as a string.
 * If the input is in CAIP-2 format (e.g., `eip155:1` or `eip155:137`), the function returns the input string as is.
 *
 * @param chainId - The chain ID to be converted. It can be in hexadecimal, decimal, or CAIP-2 format.
 * @returns - The chain ID converted to a base 10 number as a string, or the original input if it is in CAIP-2 format.
 */
export const getDecimalChainId = (chainId) => {
  if (
    !chainId ||
    typeof chainId !== 'string' ||
    !chainId.startsWith('0x') ||
    isNonEvmChainId(chainId)
  ) {
    return chainId;
  }
  return parseInt(chainId, 16).toString(10);
};

export const isMainnetByChainId = (chainId) =>
  getDecimalChainId(String(chainId)) === String(1);

export const isLineaMainnetByChainId = (chainId) =>
  getDecimalChainId(String(chainId)) === String(59144);

export const isMultiLayerFeeNetwork = (chainId) =>
  chainId === NETWORKS_CHAIN_ID.OPTIMISM;

/**
 * Gets the test network image icon.
 *
 * @param {string} networkType - Type of network.
 * @returns - Image of test network or undefined.
 */
export const getTestNetImage = (networkType) => {
  if (
    networkType === SEPOLIA ||
    networkType === LINEA_GOERLI ||
    networkType === LINEA_SEPOLIA
  ) {
    return networksWithImages?.[networkType.toUpperCase()];
  }
};

export const getTestNetImageByChainId = (chainId) => {
  if (NETWORKS_CHAIN_ID.SEPOLIA === chainId) {
    return networksWithImages?.SEPOLIA;
  }
  if (NETWORKS_CHAIN_ID.LINEA_GOERLI === chainId) {
    return networksWithImages?.['LINEA-GOERLI'];
  }
  if (NETWORKS_CHAIN_ID.LINEA_SEPOLIA === chainId) {
    return networksWithImages?.['LINEA-SEPOLIA'];
  }
  if (NETWORKS_CHAIN_ID.MEGAETH_TESTNET === chainId) {
    return networksWithImages?.['MEGAETH-TESTNET'];
  }
  if (NETWORKS_CHAIN_ID.MONAD_TESTNET === chainId) {
    return networksWithImages?.['MONAD-TESTNET'];
  }
};

/**
 * A list of chain IDs for known testnets
 */
export const TESTNET_CHAIN_IDS = [
  ChainId[NetworkType.goerli],
  ChainId[NetworkType.sepolia],
  ChainId[NetworkType['linea-goerli']],
  ChainId[NetworkType['linea-sepolia']],
  ChainId[NetworkType['megaeth-testnet']],
  ChainId[NetworkType['monad-testnet']],
];

/**
 * A map of testnet chainId and its faucet link
 */
export const TESTNET_FAUCETS = {
  [ChainId[NetworkType.sepolia]]: SEPOLIA_FAUCET,
  [ChainId[NetworkType['linea-goerli']]]: LINEA_FAUCET,
  [ChainId[NetworkType['linea-sepolia']]]: LINEA_FAUCET,
};

export const isTestNetworkWithFaucet = (chainId) =>
  TESTNET_FAUCETS[chainId] !== undefined;

/**
 * Determine whether the given chain ID is for a known testnet.
 *
 * @param {string} chainId - The chain ID of the network to check
 * @returns {boolean} `true` if the given chain ID is for a known testnet, `false` otherwise
 */
export const isTestNet = (chainId) => TESTNET_CHAIN_IDS.includes(chainId);

export function getNetworkTypeById(id) {
  if (!id) {
    throw new Error(NetworkSwitchErrorType.missingNetworkId);
  }
  const filteredNetworkTypes = NetworkListKeys.filter(
    (key) => NetworkList[key].networkId === parseInt(id, 10),
  );
  if (filteredNetworkTypes.length > 0) {
    return filteredNetworkTypes[0];
  }

  throw new Error(`${NetworkSwitchErrorType.unknownNetworkId} ${id}`);
}

export function getDefaultNetworkByChainId(chainId) {
  if (!chainId) {
    throw new Error(NetworkSwitchErrorType.missingChainId);
  }

  let returnNetwork;

  getAllNetworks().forEach((type) => {
    if (toLowerCaseEquals(String(NetworkList[type].chainId), chainId)) {
      returnNetwork = NetworkList[type];
    }
  });

  return returnNetwork;
}

export function hasBlockExplorer(key) {
  return key.toLowerCase() !== RPC;
}

export function isPrivateConnection(hostname) {
  return hostname === 'localhost' || regex.localNetwork.test(hostname);
}

/**
 * Returns custom block explorer for specific rpcTarget
 *
 * @param {string} providerRpcTarget
 * @param {object} networkConfigurations
 */
export function findBlockExplorerForRpc(rpcTargetUrl, networkConfigurations) {
  const networkConfiguration = Object.values(networkConfigurations).find(
    ({ rpcEndpoints }) => rpcEndpoints?.some(({ url }) => url === rpcTargetUrl),
  );

  if (networkConfiguration) {
    return networkConfiguration?.blockExplorerUrls[
      networkConfiguration?.defaultBlockExplorerUrlIndex
    ];
  }

  return undefined;
}

/**
 * Returns block explorer for non-evm chain id
 *
 * @param {object} internalAccount - Internal account object
 * @returns {string} - Block explorer url or undefined if not found
 */
export function findBlockExplorerForNonEvmChainId(chainId) {
  const blockExplorerUrls =
    MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[chainId];
  return blockExplorerUrls?.url;
}

/**
 * Returns block explorer for non-evm account
 *
 * @param {object} internalAccount - Internal account object
 * @returns {string} - Block explorer url or undefined if not found
 */
export function findBlockExplorerForNonEvmAccount(internalAccount) {
  let scope;

  const selectedNonEvmNetworkChainId = selectSelectedNonEvmNetworkChainId(
    store.getState(),
  );
  // Check if the selectedNonEvmNetworkChainId exists in the scopes array
  if (
    selectedNonEvmNetworkChainId &&
    internalAccount.scopes?.includes(selectedNonEvmNetworkChainId)
  ) {
    // Prioritize the selected chain ID if it's in the scopes array
    scope = selectedNonEvmNetworkChainId;
  } else {
    // Fall back to a scope that is matching of our networks
    const nonEvmNetworks = selectMultichainNetworkControllerState(
      store.getState(),
    );
    const networkConfigs =
      nonEvmNetworks.multichainNetworkConfigurationsByChainId;
    const matchingNetwork = Object.values(networkConfigs || {}).find(
      (network) => internalAccount.scopes.includes(network.chainId),
    );

    if (matchingNetwork) {
      scope = matchingNetwork.chainId;
    }
  }
  // If we couldn't determine a scope, return undefined
  if (!scope) {
    return undefined;
  }

  const blockExplorerFormatUrls =
    MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[scope];

  if (!blockExplorerFormatUrls) {
    return undefined;
  }

  return formatBlockExplorerAddressUrl(
    blockExplorerFormatUrls,
    internalAccount.address,
  );
}

/**
 * Returns a boolean indicating if both URLs have the same host
 *
 * @param {string} rpcOne
 * @param {string} rpcTwo
 */
export function compareRpcUrls(rpcOne, rpcTwo) {
  // First check that both objects are of the type string
  if (typeof rpcOne === 'string' && typeof rpcTwo === 'string') {
    const rpcUrlOne = new URL(rpcOne);
    const rpcUrlTwo = new URL(rpcTwo);
    return rpcUrlOne.host === rpcUrlTwo.host;
  }
  return false;
}

/**
 * From block explorer url, get rendereable name or undefined
 *
 * @param {string} blockExplorerUrl - block explorer url
 */
export function getBlockExplorerName(blockExplorerUrl) {
  if (!blockExplorerUrl) return undefined;
  const hostname = new URL(blockExplorerUrl).hostname;
  if (!hostname) return undefined;
  const tempBlockExplorerName = fastSplit(hostname);
  if (!tempBlockExplorerName || !tempBlockExplorerName[0]) return undefined;
  return (
    tempBlockExplorerName[0].toUpperCase() + tempBlockExplorerName.slice(1)
  );
}

/**
 * Checks whether the given value is a 0x-prefixed, non-zero, non-zero-padded,
 * hexadecimal string.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a correctly formatted hex string,
 * false otherwise.
 */
export function isPrefixedFormattedHexString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return regex.prefixedFormattedHexString.test(value);
}

export function blockTagParamIndex(payload) {
  switch (payload.method) {
    // blockTag is at index 2
    case 'eth_getStorageAt':
      return 2;
    // blockTag is at index 1
    case 'eth_getBalance':
    case 'eth_getCode':
    case 'eth_getTransactionCount':
    case 'eth_call':
      return 1;
    // blockTag is at index 0
    case 'eth_getBlockByNumber':
      return 0;
    // there is no blockTag
    default:
      return undefined;
  }
}

/**
 * Gets the current network name given the network provider.
 *
 * @param {Object} providerConfig - The provider configuration for the current selected network.
 * @returns {string} Name of the network.
 */
export const getNetworkNameFromProviderConfig = (providerConfig) => {
  let name = strings('network_information.unknown_network');
  if (providerConfig.nickname) {
    name = providerConfig.nickname;
  } else if (providerConfig.chainId === NETWORKS_CHAIN_ID.MAINNET) {
    name = 'Ethereum Main Network';
  } else if (providerConfig.chainId === NETWORKS_CHAIN_ID.LINEA_MAINNET) {
    name = 'Linea Main Network';
  } else {
    const networkType = providerConfig.type;
    name = NetworkList?.[networkType]?.name || NetworkList[RPC].name;
  }
  return name;
};

/**
 * Gets the image source for an EVM network given both the network type and the Hex chain ID.
 *
 * @param {object} params - Params that contains information about the network.
 * @param {string=} params.networkType - Type of network from the provider.
 * @param {string} params.chainId - Hex EVM chain ID of the EVM network.
 * @returns {Object} - Image source of the network.
 */
const getEvmNetworkImageSource = ({ networkType, chainId }) => {
  const defaultNetwork = getDefaultNetworkByChainId(chainId);

  if (defaultNetwork) {
    return defaultNetwork.imageSource;
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const customNetworkImg = CustomNetworkImgMapping[chainId];

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }
  if (customNetworkImg) {
    return customNetworkImg;
  }

  return getTestNetImage(networkType);
};

// getNetworkImageSource is called a lot and could be relatively expensive, so we cache the results
const imageSourceCache = new Map();

/**
 * Gets the image source for a network given both the network type and the Hex EVM chain ID or CaipChainId.
 *
 * @param {object} params - Params that contains information about the network.
 * @param {string=} params.networkType - Type of network from the provider.
 * @param {string} params.chainId - Hex EVM chain ID or CAIP chain ID of the network.
 * @returns {Object} - Image source of the network.
 */
export const getNetworkImageSource = ({ networkType, chainId }) => {
  const cacheKey = `${networkType}-${chainId}`;
  if (imageSourceCache.has(cacheKey)) {
    return imageSourceCache.get(cacheKey);
  }

  let hexChainId = chainId;
  if (isCaipChainId(chainId)) {
    const { namespace, reference } = parseCaipChainId(chainId);
    if (namespace !== KnownCaipNamespace.Eip155) {
      const nonEvmImageSource = getNonEvmNetworkImageSourceByChainId(chainId);
      imageSourceCache.set(cacheKey, nonEvmImageSource);
      return nonEvmImageSource;
    }
    hexChainId = toHex(reference === '0' ? '1' : reference); // default to mainnet if chainId is 0
  }

  const imageSource = getEvmNetworkImageSource({
    networkType,
    chainId: hexChainId,
  });
  imageSourceCache.set(cacheKey, imageSource);
  return imageSource;
};

/**
 * Returns block explorer address url and title by network
 *
 * @param {string} networkType Network type
 * @param {string} address Ethereum address to be used on the link
 * @param {string} rpcBlockExplorer rpc block explorer base url
 */
export const getBlockExplorerAddressUrl = (
  networkType,
  address,
  rpcBlockExplorer = null,
) => {
  const isCustomRpcBlockExplorerNetwork = networkType === RPC;

  if (isCustomRpcBlockExplorerNetwork) {
    if (!rpcBlockExplorer) return { url: null, title: null };

    const url = `${rpcBlockExplorer}/address/${address}`;
    const title = new URL(rpcBlockExplorer).hostname;
    return { url, title };
  }

  const url = getEtherscanAddressUrl(networkType, address);
  const title = getEtherscanBaseUrl(networkType).replace('https://', '');
  return { url, title };
};

/**
 * Returns block explorer transaction url and title by network
 *
 * @param {string} networkType Network type
 * @param {string} transactionHash hash of the transaction to be used on the link
 * @param {string} rpcBlockExplorer rpc block explorer base url
 */
export const getBlockExplorerTxUrl = (
  networkType,
  transactionHash,
  rpcBlockExplorer = null,
) => {
  const isCustomRpcBlockExplorerNetwork = networkType === RPC;

  if (isCustomRpcBlockExplorerNetwork) {
    if (!rpcBlockExplorer) return { url: null, title: null };

    const url = `${rpcBlockExplorer}/tx/${transactionHash}`;
    const title = new URL(rpcBlockExplorer).hostname;
    return { url, title };
  }

  const url = getEtherscanTransactionUrl(networkType, transactionHash);
  const title = getEtherscanBaseUrl(networkType).replace('https://', '');
  return { url, title };
};

/**
 * Returns if the chainId network provided is already onboarded or not
 * @param {string} chainId - network chain Id
 * @param {obj} networkOnboardedState - Object with onboarded networks
 * @returns
 */
export const getIsNetworkOnboarded = (chainId, networkOnboardedState) =>
  networkOnboardedState[chainId];

export const isPermissionsSettingsV1Enabled =
  process.env.MM_PERMISSIONS_SETTINGS_V1_ENABLED === 'true';

// The whitelisted network names for the given chain IDs to prevent showing warnings on Network Settings.
export const WHILELIST_NETWORK_NAME = {
  [ChainId.mainnet]: 'Mainnet',
  [ChainId['linea-mainnet']]: 'Linea Mainnet',
  [ChainId['megaeth-testnet']]: 'Mega Testnet',
  [ChainId['monad-testnet']]: 'Monad Testnet',
  [NETWORKS_CHAIN_ID.SEI]: 'Sei Mainnet',
  [NETWORKS_CHAIN_ID.HYPER_EVM]: 'HyperEVM',
  [NETWORKS_CHAIN_ID.MEGAETH_MAINNET]: 'MegaEth',
};

// Whitelisted symbols for specific chain IDs to prevent showing warnings on Network Settings.
export const WHITELIST_SYMBOL = {
  [NETWORKS_CHAIN_ID.HYPER_EVM]: 'HYPE',
  [NETWORKS_CHAIN_ID.MEGAETH_MAINNET]: 'ETH',
};

export const WHITELIST_NETWORK_RPC_URL = {
  [NETWORKS_CHAIN_ID.HYPER_EVM]: 'https://rpc.hyperliquid.xyz',
  [NETWORKS_CHAIN_ID.MEGAETH_MAINNET]: 'https://mainnet.megaeth.com/rpc',
};

/**
 * Checks if the network name is valid for the given chain ID.
 * This function allows for specific network names for certain chain IDs.
 * For example, it allows 'Mainnet' for Ethereum Mainnet, 'Linea Mainnet' for Linea Mainnet,
 * and 'Mega Testnet' for MegaEth Testnet.
 *
 * @param {string} chainId - The chain ID to check.
 * @param {string} networkName - The network name to validate.
 * @param {string} nickname - The nickname of the network.
 * @returns A boolean indicating whether the network name is valid for the given chain ID.
 */
export const isValidNetworkName = (chainId, networkName, nickname) =>
  networkName === nickname || WHILELIST_NETWORK_NAME[chainId] === nickname;

/**
 * Checks if the symbol is whitelisted for the given chain ID.
 * This function allows for specific symbols for certain chain IDs.
 *
 * @param {string} chainId - The chain ID to check.
 * @param {string} symbol - The symbol to check.
 * @returns {boolean} - Whether the symbol is whitelisted for the given chain ID.
 */
export const isWhitelistedSymbol = (chainId, symbol) => {
  if (!chainId || !symbol) {
    return false;
  }

  return WHITELIST_SYMBOL[chainId]?.toLowerCase() === symbol.toLowerCase();
};

/**
 * Checks if the RPC URL is whitelisted for the given chain ID.
 * This function allows for specific RPC URLs for certain chain IDs.
 *
 * @param {string} chainId - The chain ID to check.
 * @param {string} rpcUrl - The RPC URL to check.
 * @returns {boolean} - Whether the RPC URL is whitelisted for the given chain ID.
 */
export const isWhitelistedRpcUrl = (chainId, rpcUrl) => {
  if (!chainId || !rpcUrl) {
    return false;
  }

  return (
    WHITELIST_NETWORK_RPC_URL[chainId]?.toLowerCase() === rpcUrl.toLowerCase()
  );
};

/**
 * Checks if the network name is whitelisted for the given chain ID.
 * This function allows for specific network names for certain chain IDs.
 *
 * @param {string} chainId - The chain ID to check.
 * @param {string} networkName - The network name to check.
 * @returns {boolean} - Whether the network name is whitelisted for the given chain ID.
 */
export const isWhitelistedNetworkName = (chainId, networkName) => {
  if (!chainId || !networkName) {
    return false;
  }

  return (
    WHILELIST_NETWORK_NAME[chainId]?.toLowerCase() === networkName.toLowerCase()
  );
};
