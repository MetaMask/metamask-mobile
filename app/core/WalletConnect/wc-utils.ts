import { rpcErrors } from '@metamask/rpc-errors';
import { CaipChainId, Hex, KnownCaipNamespace } from '@metamask/utils';
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
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import Engine from '../Engine';
import { APPROVED_METHODS_BY_NAMESPACE } from './wc-config';

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
  /** CAIP-2 chain IDs to advertise (e.g. ["eip155:1", "tron:728126428"]) */
  chains: string[];
  /** WalletConnect methods the wallet supports for this namespace */
  methods: string[];
  /** Events emitted by the wallet for this namespace */
  events: string[];
  /** CAIP-10 account strings (e.g. ["eip155:1:0xabc...", "tron:728126428:TAddr..."]) */
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

/**
 * Normalizes a CAIP-2 chain ID coming FROM WalletConnect to MetaMask's internal format.
 * Dispatches per namespace — add a new chain block below to handle future format mismatches.
 *
 * All conversions are currently no-ops (commented out per chain) until dApps adopt
 * the canonical formats from ChainAgnostic/namespaces.
 */
export const normalizeCaipChainIdInbound = (caipChainId: string): string => {
  const namespace = caipChainId.split(':')[0];

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (namespace === KnownCaipNamespace.Tron) {
    // WalletConnect hex → MetaMask decimal (ChainAgnostic/namespaces#170)
    // const chainRef = caipChainId.slice('tron:'.length);
    // if (chainRef.startsWith('0x')) return `tron:${parseInt(chainRef, 16)}`;
    return caipChainId;
  }
  ///: END:ONLY_INCLUDE_IF

  return caipChainId;
};

/**
 * Normalizes a CAIP-2 chain ID going TO WalletConnect from MetaMask's internal format.
 * Dispatches per namespace — add a new chain block below to handle future format mismatches.
 *
 * All conversions are currently no-ops (commented out per chain) until dApps adopt
 * the canonical formats from ChainAgnostic/namespaces.
 */
export const normalizeCaipChainIdOutbound = (caipChainId: string): string => {
  const namespace = caipChainId.split(':')[0];

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (namespace === KnownCaipNamespace.Tron) {
    // MetaMask decimal → WalletConnect hex (ChainAgnostic/namespaces#170)
    // const chainRef = caipChainId.slice('tron:'.length);
    // if (!chainRef.startsWith('0x')) return `tron:0x${parseInt(chainRef, 10).toString(16)}`;
    return caipChainId;
  }
  ///: END:ONLY_INCLUDE_IF

  return caipChainId;
};

export const getScopedPermissions = async ({
  channelId,
}: {
  channelId: string;
}) => {
  // Each chain appends its own block to this map.
  // To add a new chain, add a flag-guarded block below.
  const namespaces: Record<string, NamespaceConfig> = {};

  // EIP155 namespace
  const approvedAccounts = getPermittedAccounts(channelId);
  const evmChains = (await getPermittedChains(channelId)).filter((chain) =>
    chain.startsWith(`${KnownCaipNamespace.Eip155}:`),
  );
  DevLogger.log(
    `WC::getScopedPermissions eip155 accounts=${JSON.stringify(approvedAccounts)} chains=${JSON.stringify(evmChains)}`,
  );
  namespaces[KnownCaipNamespace.Eip155] = {
    chains: evmChains,
    methods: APPROVED_METHODS_BY_NAMESPACE[KnownCaipNamespace.Eip155],
    events: ['chainChanged', 'accountsChanged'],
    accounts: evmChains.flatMap((chain) =>
      Array.isArray(approvedAccounts)
        ? approvedAccounts.map((account) => `${chain}:${account}`)
        : [],
    ),
  };

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronAccounts = Engine.context.AccountsController.listAccounts().filter(
    (account) => account.type === TrxAccountType.Eoa,
  );
  if (tronAccounts.length > 0) {
    const tronChainId = normalizeCaipChainIdOutbound(TrxScope.Mainnet);
    const tronAccountStrings = tronAccounts.map(
      (account) => `${tronChainId}:${account.address}`,
    );
    namespaces[KnownCaipNamespace.Tron] = {
      chains: [tronChainId],
      methods: APPROVED_METHODS_BY_NAMESPACE[KnownCaipNamespace.Tron],
      events: [],
      accounts: tronAccountStrings,
    };
    DevLogger.log(
      `WC::getScopedPermissions added Tron namespace`,
      tronAccountStrings,
    );
  }
  ///: END:ONLY_INCLUDE_IF

  DevLogger.log(`WC::getScopedPermissions final namespaces`, namespaces);
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
) => request.verifyContext?.verified?.origin ?? defaultOrigin;
