import { PermissionController } from '@metamask/permission-controller';
import { NavigationContainerRef } from '@react-navigation/native';
import { ProposalTypes, RelayerTypes } from '@walletconnect/types';
import { parseRelayParams } from '@walletconnect/utils';
import qs from 'qs';
import Routes from '../../../app/constants/navigation/Routes';
import { store } from '../../../app/store';
import { CaveatTypes } from '../Permissions/constants';
import { PermissionKeys } from '../Permissions/specifications';
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

const parseWalletConnectUri = (uri: string): WCMultiVersionParams => {
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
    version: parseInt(requiredValues[1], 10),
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

const MAX_LOOP_COUNTER = 60;
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
      // exit the looop
    } else {
      await wait(1000);
    }

    if (loopCounter >= MAX_LOOP_COUNTER) {
      throw new Error('Timeout error');
    }
  }
};

interface WCPermissionParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissionsController: PermissionController<any, any> | undefined;
  origin: string;
  defaultChainId?: string;
  requiredNamespaces?: Record<string, ProposalTypes.RequiredNamespace>;
  optionalNamespaces?: Record<string, ProposalTypes.OptionalNamespaces>;
}

export const normalizeOrigin = (origin: string): string => {
  try {
    // Remove protocol and trailing slashes
    return origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
  } catch (error) {
    DevLogger.log(`WC::normalizeOrigin error:`, error);
    return origin;
  }
};

export const getPermittedChains = ({
  permissionsController,
  origin,
  defaultChainId
}: WCPermissionParams): string[] => {
  try {
    const normalizedOrigin = normalizeOrigin(origin);
    // const normalizedOrigin = origin;

    // const caveat = permissionsController?.getCaveat(
    const caveat = permissionsController?.getCaveat(
      normalizedOrigin,
      PermissionKeys.permittedChains,
      CaveatTypes.restrictNetworkSwitching,
    );

    DevLogger.log(`WC::getApprovedWCChains caveat found:`, { caveat });

    if (Array.isArray(caveat?.value)) {
      const chains = caveat.value
        .filter((item): item is string => typeof item === 'string')
        .map(chainId => `eip155:${parseInt(chainId)}`);

      DevLogger.log(`WC::getApprovedWCChains extracted chains:`, chains);
      return chains;
    }

    // Fallback to default
    const defaultChains = defaultChainId ? [`eip155:${parseInt(defaultChainId)}`] : [];
    DevLogger.log(`WC::getApprovedWCChains using default:`, defaultChains);
    return defaultChains;

  } catch (error) {
    DevLogger.log(`WC::getApprovedWCChains error for origin=${origin}:`, error);
    return defaultChainId ? [`eip155:${parseInt(defaultChainId)}`] : [];
  }
};

export const getApprovedWCMethods = (_: {
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
    'wallet_scanQRCode'
  ];
  // const normalizedRequired = normalizeNamespaces(requiredNamespaces ?? {});

  // const defaultMethods = normalizedRequired[EVM_IDENTIFIER]?.methods?.length
  // ? normalizedRequired[EVM_IDENTIFIER].methods
  // : ['eth_sendTransaction', 'personal_sign'];

  // try {
  //   const permissions = permissionsController?.getPermissions(origin);
  //   DevLogger.log(`WC::getApprovedWCMethods permissions for origin=${origin}:`, permissions);

  //   if (!permissions) {
  //     DevLogger.log(`WC::getApprovedWCMethods no permissions, using defaults:`, defaultMethods);
  //     return defaultMethods;
  //   }

  //   const permissionMethods = Object.keys(permissions)
  //     .filter(key => key.startsWith('eth_') || key.startsWith('personal_'))
  //     .map(key => key);

  //   const result = [...new Set([...defaultMethods, ...permissionMethods])];
  //   DevLogger.log(`WC::getApprovedWCMethods result:`, result);
  //   return result;

  // } catch (error) {
  //   DevLogger.log(`WC::getApprovedWCMethods error for origin=${origin}:`, error);
  //   return defaultMethods;
  // }
  return allEIP155Methods;
};

export default parseWalletConnectUri;
