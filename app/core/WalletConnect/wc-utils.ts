import { rpcErrors } from '@metamask/rpc-errors';
import { CaipChainId, Hex, KnownCaipNamespace } from '@metamask/utils';
import { NavigationContainerRef } from '@react-navigation/native';
import { RelayerTypes } from '@walletconnect/types';
import { parseRelayParams } from '@walletconnect/utils';
import qs from 'qs';
import Routes from '../../../app/constants/navigation/Routes';
import { store } from '../../../app/store';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNetworkConfigurations,
  selectNetworkConfigurationsByCaipChainId,
} from '../../selectors/networkController';
import { getPermittedAccounts, getPermittedChains } from '../Permissions';
import { findExistingNetwork } from '../RPCMethods/lib/ethereum-chain-utils';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { wait } from '../SDKConnect/utils/wait.util';
import { WalletKitTypes } from '@reown/walletkit';

export interface WCMultiVersionParams {
  protocol: string;
  version: number;
  topic: string;
  // v2 params
  symKey?: string;
  relay?: RelayerTypes.ProtocolOptions;
  // v1 params
  bridge?: string;
  key?: string;
  handshakeTopic?: string;
}

export const getHostname = (uri: string): string => {
  try {
    // Handle empty or invalid URIs
    if (!uri) return '';

    // For standard URLs, use URL API
    if (uri.includes('://')) {
      try {
        const url = new URL(uri);
        return url.hostname;
      } catch (e) {
        // If URL parsing fails, continue with manual parsing
      }
    }

    // For protocol-based URIs like wc: or ethereum:
    const pathStart: number = uri.indexOf(':');
    if (pathStart !== -1) {
      return uri.substring(0, pathStart);
    }

    // If no protocol separator found, return the original string
    return uri;
  } catch (error) {
    DevLogger.log('Error in getHostname:', error);
    return uri;
  }
};

/**
 * Normalizes a dApp URL by ensuring it has a valid protocol.
 * This prevents crashes when processing malformed URLs from WalletConnect metadata.
 *
 * @param url - The URL string to normalize
 * @param defaultProtocol - The protocol to use if none is present (defaults to 'https://')
 * @returns The normalized URL with a valid protocol, or empty string if invalid
 */
export const normalizeDappUrl = (
  url: string | undefined | null,
  defaultProtocol = 'https://',
): string => {
  try {
    // Handle empty or null URLs
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '';
    }

    const trimmedUrl = url.trim();

    // Check if URL already has a protocol
    if (trimmedUrl.includes('://')) {
      // Validate that it's a proper URL
      try {
        new URL(trimmedUrl);
        return trimmedUrl;
      } catch (e) {
        // Invalid URL format even with protocol
        DevLogger.log('Invalid URL format:', trimmedUrl);
        return '';
      }
    }

    // URL doesn't have a protocol, add the default one
    const normalizedUrl = `${defaultProtocol}${trimmedUrl}`;

    // Validate the resulting URL
    try {
      new URL(normalizedUrl);
      return normalizedUrl;
    } catch (e) {
      // Still invalid after adding protocol
      DevLogger.log('Unable to normalize URL:', trimmedUrl);
      return '';
    }
  } catch (error) {
    DevLogger.log('Error in normalizeDappUrl:', error);
    return '';
  }
};

/**
 * Safely extracts the hostname from a dApp URL.
 * Unlike getHostname, this specifically handles dApp URLs and ensures
 * proper normalization before extraction.
 *
 * @param url - The URL string to extract hostname from
 * @returns The hostname or empty string if invalid
 */
export const getSafeDappHostname = (url: string | undefined | null): string => {
  try {
    const normalizedUrl = normalizeDappUrl(url);
    if (!normalizedUrl) {
      return '';
    }

    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.hostname;
  } catch (error) {
    DevLogger.log('Error in getSafeDappHostname:', error);
    return '';
  }
};

export const parseWalletConnectUri = (uri: string): WCMultiVersionParams => {
  // Handle wc:{} and wc://{} format
  const str = uri.startsWith('wc://') ? uri.replace('wc://', 'wc:') : uri;
  const pathStart: number = str.indexOf(':');
  const pathEnd: number | undefined =
    str.indexOf('?') !== -1 ? str.indexOf('?') : undefined;
  const protocol = str.substring(0, pathStart);
  const path: string = str.substring(pathStart + 1, pathEnd);
  const requiredValues = path.split('@');

  const queryString: string =
    typeof pathEnd !== 'undefined' ? str.substring(pathEnd) : '';
  const queryParams = qs.parse(queryString);
  const result = {
    protocol,
    topic: requiredValues[0],
    version: Number.parseInt(requiredValues[1], 10),
    symKey: queryParams.symKey as string,
    relay: parseRelayParams(queryParams),
    bridge: queryParams.bridge as string,
    key: queryParams.key as string,
    handshakeTopic: queryParams.handshakeTopic as string,
  };

  return result;
};

export const hideWCLoadingState = ({
  navigation,
}: {
  navigation?: NavigationContainerRef;
}): void => {
  const currentRoute = navigation?.getCurrentRoute()?.name;
  if (currentRoute === Routes.SHEET.SDK_LOADING && navigation?.canGoBack()) {
    navigation?.goBack();
  } else if (
    currentRoute === Routes.SDK.RETURN_TO_DAPP_NOTIFICATION &&
    navigation?.canGoBack()
  ) {
    // also close return to dapp if it wasnt previously closed
    navigation?.goBack();
  }
};

export const showWCLoadingState = ({
  navigation,
}: {
  navigation?: NavigationContainerRef;
}): void => {
  navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SDK_LOADING,
  });
};

export const isValidWCURI = (uri: string): boolean => {
  const result = parseWalletConnectUri(uri);
  if (result.version === 1) {
    return !(!result.handshakeTopic || !result.bridge || !result.key);
  } else if (result.version === 2) {
    return !(!result.topic || !result.symKey || !result.relay);
  }
  return false;
};

// Export a config object that can be modified for testing
export const networkModalOnboardingConfig = {
  MAX_LOOP_COUNTER: 60,
};

export const waitForNetworkModalOnboarding = async ({
  chainId,
}: {
  chainId: string;
}): Promise<void> => {
  let waitForNetworkModalOnboarded = true;

  // throw timeout error after 30sec
  let loopCounter = 0;

  while (waitForNetworkModalOnboarded) {
    loopCounter += 1;
    const { networkOnboarded } = store.getState();
    const { networkOnboardedState } = networkOnboarded;

    if (networkOnboardedState[chainId]) {
      waitForNetworkModalOnboarded = false;
      // exit the loop
    } else {
      await wait(1000);
    }

    if (loopCounter >= networkModalOnboardingConfig.MAX_LOOP_COUNTER) {
      throw new Error('Timeout error');
    }
  }
};

export const getApprovedSessionMethods = (): string[] => {
  const allEIP155Methods = [
    // Standard JSON-RPC methods
    'eth_sendTransaction',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'personal_sign',
    'eth_sendRawTransaction',
    'eth_accounts',
    'eth_getBalance',
    'eth_call',
    'eth_estimateGas',
    'eth_blockNumber',
    'eth_getCode',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getTransactionByHash',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',
    'net_version',
    'eth_chainId',
    'eth_requestAccounts',

    // MetaMask specific methods
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_watchAsset',
    'wallet_scanQRCode',
  ];

  // TODO: extract from the permissions controller when implemented
  return allEIP155Methods;
};

export const getScopedPermissions = async ({
  channelId,
}: {
  channelId: string;
}) => {
  const approvedAccounts = getPermittedAccounts(channelId);
  const chains = await getPermittedChains(channelId);

  DevLogger.log(
    `WC::getScopedPermissions for ${channelId}, found accounts:`,
    approvedAccounts,
  );

  DevLogger.log(
    `WC::getScopedPermissions for ${channelId}, found chains:`,
    chains,
  );

  // Create properly formatted account strings for each chain and account
  const accountsPerChains = chains.flatMap((chain) =>
    Array.isArray(approvedAccounts)
      ? approvedAccounts.map((account) => `${chain}:${account}`)
      : [],
  );

  const scopedPermissions = {
    chains,
    methods: getApprovedSessionMethods(),
    events: ['chainChanged', 'accountsChanged'],
    accounts: accountsPerChains,
  };

  DevLogger.log(
    `WC::getScopedPermissions final permissions`,
    scopedPermissions,
  );
  return {
    [KnownCaipNamespace.Eip155]: scopedPermissions,
  };
};

export const isSwitchingChainRequest = (
  request: WalletKitTypes.SessionRequest,
) => {
  const {
    params: {
      request: { method },
    },
  } = request;
  return method === 'wallet_switchEthereumChain';
};

export const getChainIdForCaipChainId = (caipChainId: CaipChainId) => {
  const caipNetworkConfiguration = selectNetworkConfigurationsByCaipChainId(
    store.getState(),
  );
  const networkConfig = caipNetworkConfiguration[caipChainId];

  if (!networkConfig) {
    throw new Error(
      `No network configuration found for CAIP chain ID: ${caipChainId}`,
    );
  }

  const { chainId } = networkConfig;

  if (!chainId) {
    throw new Error(
      `No chainId found in network configuration for CAIP chain ID: ${caipChainId}`,
    );
  }

  return chainId as Hex;
};

export const getRequestCaip2ChainId = (
  request: WalletKitTypes.SessionRequest,
) => {
  const isSwitchingChain = isSwitchingChainRequest(request);
  const hexChainId = isSwitchingChain
    ? request.params.request.params[0].chainId
    : getChainIdForCaipChainId(request.params.chainId as CaipChainId);
  const caip2ChainId = `eip155:${parseInt(hexChainId, 16)}` as CaipChainId;
  return caip2ChainId;
};

export const getNetworkClientIdForCaipChainId = (caipChainId: CaipChainId) => {
  const networkConfigurationsByChainId =
    selectEvmNetworkConfigurationsByChainId(store.getState());
  const chainId = getChainIdForCaipChainId(caipChainId);
  const networkConfig = networkConfigurationsByChainId[chainId as Hex];

  if (!networkConfig) {
    throw new Error(`No network configuration found for chain ID: ${chainId}`);
  }

  const { rpcEndpoints } = networkConfig;

  if (!rpcEndpoints || rpcEndpoints.length === 0) {
    throw new Error(`No RPC endpoints found for chain ID: ${chainId}`);
  }

  const { networkClientId } = rpcEndpoints[0];

  if (!networkClientId) {
    throw new Error(
      `No networkClientId found in RPC endpoint for chain ID: ${chainId}`,
    );
  }

  return networkClientId;
};

export const hasPermissionsToSwitchChainRequest = async (
  caip2ChainId: CaipChainId,
  channelId: string,
) => {
  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const hexChainIdString = getChainIdForCaipChainId(caip2ChainId);

  const existingNetwork = findExistingNetwork(
    hexChainIdString,
    networkConfigurations,
  );

  if (!existingNetwork) {
    DevLogger.log(`WC::checkWCPermissions no existing network found`);
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: active chainId is different than the one provided.`,
    });
  }

  const permittedChains = await getPermittedChains(channelId);
  const isAllowedChainId = permittedChains.includes(caip2ChainId);
  DevLogger.log(`WC::checkWCPermissions permittedChains: ${permittedChains}`);

  return {
    allowed: isAllowedChainId,
    existingNetwork,
    hexChainIdString,
  };
};

export const getRequestOrigin = (
  request: WalletKitTypes.SessionRequest,
  defaultOrigin: string,
) => request.verifyContext?.verified?.origin ?? defaultOrigin;
