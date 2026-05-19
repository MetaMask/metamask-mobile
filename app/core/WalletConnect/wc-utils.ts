import { rpcErrors } from '@metamask/rpc-errors';
import {
  CaipChainId,
  Hex,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
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
import { EVM_APPROVED_METHODS, EVM_METHODS_TO_REDIRECT } from './wc-config';

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

/**
 * Describes a namespace to include in a WalletConnect session.
 * Used for all chains: EVM, Tron, Solana, etc.
 */
export interface NamespaceConfig {
  /** CAIP-2 chain IDs to advertise (e.g. ["eip155:1", "tron:0x2b6653dc"]) */
  chains: string[];
  /** WalletConnect methods the wallet supports for this namespace */
  methods: string[];
  /** Events emitted by the wallet for this namespace */
  events: string[];
  /** CAIP-10 account strings (e.g. ["eip155:1:0xabc...", "tron:0x2b6653dc:TAddr..."]) */
  accounts: string[];
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
 * Validates a URL.
 *
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 */
export const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  // Validate the URL
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
};

/**
 * Normalizes a dApp URL by ensuring it has a valid protocol.
 *
 * @param url - The URL string to normalize
 * @param defaultProtocol - The protocol to use if none is present (defaults to 'https://')
 * @returns The normalized URL with a valid protocol, or empty string if invalid
 */
export const normalizeDappUrl = (
  url: string | undefined | null,
  defaultProtocol = 'https://',
): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '';
  }

  const trimmedUrl = url.trim();

  // Add protocol if missing
  const normalizedUrl = trimmedUrl.includes('://')
    ? trimmedUrl
    : `${defaultProtocol}${trimmedUrl}`;

  // Validate the URL
  try {
    new URL(normalizedUrl);
    return normalizedUrl;
  } catch {
    DevLogger.log('Invalid URL format:', trimmedUrl);
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
  navigation?: NavigationContainerRef<ParamListBase>;
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
  navigation?: NavigationContainerRef<ParamListBase>;
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

export const getScopedPermissions = async ({
  channelId,
}: {
  channelId: string;
}) => {
  const permittedChains = await getPermittedChains(channelId);
  const evmChains = permittedChains.filter((chain) =>
    chain.startsWith(`${KnownCaipNamespace.Eip155}:`),
  );

  if (evmChains.length === 0) {
    DevLogger.log(`WC::getScopedPermissions no permitted EVM chains found`);
    return {};
  }

  // Each chain appends its own block to this map.
  // To add a new chain, add a flag-guarded block below.
  DevLogger.log(`WC::getScopedPermissions channelId=${channelId}`);
  const namespaces: Record<string, NamespaceConfig> = {};
  // EIP155 namespace
  const approvedAccounts = getPermittedAccounts(channelId);
  if (!Array.isArray(approvedAccounts)) {
    throw rpcErrors.internal({
      message: `WalletConnect permissions are in an unexpected format: approved accounts must be an array.`,
    });
  }

  namespaces[KnownCaipNamespace.Eip155] = {
    chains: evmChains,
    methods: EVM_APPROVED_METHODS,
    events: ['chainChanged', 'accountsChanged'],
    accounts: evmChains.flatMap((chain) =>
      // TODO approvedAccounts are not filtered by namescpae
      approvedAccounts.map((account) => `${chain}:${account}`),
    ),
  };

  return namespaces;
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
      message: `Requested chain does not exist in wallet configuration.`,
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

/**
 * Returns the origin for a WalletConnect session request.
 *
 * WARNING: The returned value is **NOT a trusted origin**. It comes from one of
 * two sources, neither of which is independently verified:
 *
 * 1. `verifyContext?.verified?.origin` — Provided by WalletConnect's Verify API
 * when available. Offers some domain verification but is optional and not
 * always present.
 * 2. `defaultOrigin` — Falls back to the self-reported `session.peer.metadata.url`
 * which is entirely dapp-controlled and trivially spoofable.
 *
 * This value MUST NOT be treated as equivalent to a browser-provided origin
 * (e.g., `sender.url` on extension or WebView URL on mobile).
 */
export const getUnverifiedRequestOrigin = (
  request: WalletKitTypes.SessionRequest,
  defaultOrigin: string,
) => {
  // Only trust verifyContext.verified.origin when it's a parseable URL. The
  // WalletConnect Verify API may return an empty string or a non-URL value
  // (e.g. a topic/identifier) when the dapp is unverified, which would
  // otherwise be rendered verbatim in the "Request from" field.
  const verifiedOrigin = request.verifyContext?.verified?.origin;
  if (isValidUrl(verifiedOrigin)) {
    return verifiedOrigin as string;
  }
  return defaultOrigin;
};

/**
 * Determine whether a WalletConnect request method should trigger a deeplink redirect for EVM chains.
 */
export const isRedirectMethodForChain = ({
  scope,
  method,
}: {
  scope: CaipChainId;
  method: string;
}): boolean => {
  if (scope.startsWith(KnownCaipNamespace.Eip155)) {
    return EVM_METHODS_TO_REDIRECT.includes(method);
  }
  return false;
};

/**
 * Whether this CAIP namespace belongs to EIP-155 chains or not.
 *
 * Should be removed when we'll create a specific adapter for Eip155 chains.
 */
export const isEIP155NameSpace = (namespace: string): boolean =>
  namespace === KnownCaipNamespace.Eip155 ||
  namespace === KnownCaipNamespace.Wallet;

/**
 * Whether this CAIP chain id belongs to an EIP-155 chain or not.
 *
 * Should be removed when we'll create a specific adapter for Eip155 chains.
 */
export const isEIP155Scope = (scope: CaipChainId): boolean => {
  const { namespace } = parseCaipChainId(scope);
  return isEIP155NameSpace(namespace);
};
