import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { NavigationContainerRef } from '@react-navigation/native';
import { RelayerTypes } from '@walletconnect/types';
import { parseRelayParams } from '@walletconnect/utils';
import qs from 'qs';
import Routes from '../../../app/constants/navigation/Routes';
import { store } from '../../../app/store';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../selectors/networkController';
import Engine from '../Engine';
import { EVM_IDENTIFIER } from '../Multichain/constants';
import { getPermittedAccounts, getPermittedChains } from '../Permissions';
import {
  findExistingNetwork,
  switchToNetwork,
} from '../RPCMethods/lib/ethereum-chain-utils';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { wait } from '../SDKConnect/utils/wait.util';

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
    currentRoute === Routes.SHEET.RETURN_TO_DAPP_MODAL &&
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

export const normalizeOrigin = (origin: string): string => {
  try {
    // If origin is null or undefined, return empty string
    if (!origin) {
      DevLogger.log('WC::normalizeOrigin received null/undefined origin');
      return '';
    }

    // If already a domain without protocol, return it
    if (!origin.includes('://')) {
      return origin;
    }

    // Parse URL to extract just the hostname (domain)
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch (urlError) {
      // If URL parsing fails, try a simple regex approach
      const match = origin.match(/^(?:https?:\/\/)?([^\/]+)/i);
      return match ? match[1] : origin;
    }
  } catch (error) {
    DevLogger.log('WC::normalizeOrigin error:', error);
    return origin;
  }
};

export const getApprovedSessionMethods = (_: {
  origin: string;
}): string[] => {
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

export const getScopedPermissions = async ({ origin }: { origin: string }) => {
  // origin is already normalized by this point - no need to normalize again
  const approvedAccounts = await getPermittedAccounts(origin);
  const chains = await getPermittedChains(origin);

  DevLogger.log(
    `WC::getScopedPermissions for ${origin}, found accounts:`,
    approvedAccounts,
  );

  // Create properly formatted account strings for each chain and account
  const accountsPerChains = chains.flatMap((chain) =>
    approvedAccounts.map((account) => `${chain}:${account}`),
  );

  const scopedPermissions = {
    chains,
    methods: getApprovedSessionMethods({ origin }),
    events: ['chainChanged', 'accountsChanged'],
    accounts: accountsPerChains,
  };

  DevLogger.log(
    `WC::getScopedPermissions final permissions`,
    scopedPermissions,
  );
  return {
    [EVM_IDENTIFIER]: scopedPermissions,
  };
};

const requestUserApproval = async ({
  type = '',
}: { type: string; requestData: Record<string, unknown> }) => {
  await Engine.context.ApprovalController.clear(
    providerErrors.userRejectedRequest(),
  );
  const responseData = await Engine.context.ApprovalController.add({
    origin,
    type,
  });
  return responseData;
};

export const checkWCPermissions = async ({
  origin,
  caip2ChainId,
}: { origin: string; caip2ChainId: string }) => {
  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const decimalChainId = caip2ChainId.split(':')[1];
  const hexChainIdString = `0x${parseInt(decimalChainId, 10).toString(16)}`;

  const existingNetwork = findExistingNetwork(
    hexChainIdString,
    networkConfigurations,
  );

  const permittedChains = await getPermittedChains(origin);
  const isAllowedChainId = permittedChains.includes(caip2ChainId);
  const providerConfig = selectProviderConfig(store.getState());
  const activeCaip2ChainId = `${EVM_IDENTIFIER}:${parseInt(providerConfig.chainId, 16)}`;

  DevLogger.log(
    `WC::checkWCPermissions origin=${origin} caip2ChainId=${caip2ChainId} activeCaip2ChainId=${activeCaip2ChainId} permittedChains=${permittedChains} isAllowedChainId=${isAllowedChainId}`,
  );

  if (!existingNetwork) {
    DevLogger.log(`WC::checkWCPermissions no existing network found`);
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: active chainId is different than the one provided.`,
    });
  }

  if (!isAllowedChainId) {
    DevLogger.log(`WC::checkWCPermissions chainId is not permitted`);
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: active chainId is different than the one provided.`,
    });
  }

  DevLogger.log(
    `WC::checkWCPermissions switching to network:`,
    existingNetwork,
  );

  if (caip2ChainId !== activeCaip2ChainId) {
    try {
      await switchToNetwork({
        network: existingNetwork,
        chainId: hexChainIdString,
        controllers: Engine.context,
        requestUserApproval,
        analytics: {},
        origin,
        isAddNetworkFlow: false,
      });
    } catch (error) {
      DevLogger.log(
        `WC::checkWCPermissions error switching to network:`,
        error,
      );
      return false;
    }
  }

  return true;
};
