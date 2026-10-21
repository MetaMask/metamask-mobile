import AppConstants from '../../core/AppConstants';
import type { RootState } from '../../reducers';

export interface BasicFunctionalityGateState {
  enabled: boolean;
  selectedRpcUrls: string[];
}

const INFURA_PROJECT_ID_TOKEN = '{infuraProjectId}';

const defaultGateState = (): BasicFunctionalityGateState => ({
  enabled: true,
  selectedRpcUrls: [],
});

let readGateState: () => BasicFunctionalityGateState = defaultGateState;

export function registerBasicFunctionalityGateReader(
  reader: () => BasicFunctionalityGateState,
): void {
  readGateState = reader;
}

export function resetBasicFunctionalityGateReader(): void {
  readGateState = defaultGateState;
}

export function getBasicFunctionalityGateState(): BasicFunctionalityGateState {
  return readGateState();
}

/**
 * True when `requestUrl` is the currently selected network RPC.
 * Infura project-id placeholders in the configured URL match the resolved URL.
 */
export function requestMatchesSelectedRpc(
  requestUrl: string,
  selectedRpcUrls: string[],
): boolean {
  let request: URL;
  try {
    request = new URL(requestUrl);
  } catch {
    return false;
  }

  return selectedRpcUrls.some((configuredUrl) => {
    let selected: URL;
    try {
      selected = new URL(configuredUrl.replace(INFURA_PROJECT_ID_TOKEN, ''));
    } catch {
      return false;
    }

    if (request.origin !== selected.origin) {
      return false;
    }

    if (request.pathname === selected.pathname) {
      return true;
    }

    const selectedPath = selected.pathname.endsWith('/')
      ? selected.pathname
      : `${selected.pathname}/`;

    return request.pathname.startsWith(selectedPath);
  });
}

/**
 * True when basic functionality is off and this URL is a MetaMask service
 * rather than the selected RPC. JSON-RPC methods share the RPC URL, so
 * eth_chainId, eth_blockNumber, eth_getBalance, and fee methods stay allowed
 * together.
 */
export function isBasicFunctionalityRequestBlocked(
  requestUrl: string,
  selectedRpcUrls: string[],
): boolean {
  if (requestMatchesSelectedRpc(requestUrl, selectedRpcUrls)) {
    return false;
  }

  return AppConstants.BASIC_FUNCTIONALITY_BLOCK_LIST.some((blockedUrl) =>
    requestUrl.includes(blockedUrl),
  );
}

export function readBasicFunctionalityGateState(
  state: RootState,
): BasicFunctionalityGateState {
  const networkController = state.engine?.backgroundState?.NetworkController;
  const selectedNetworkClientId = networkController?.selectedNetworkClientId;
  const selectedRpcUrls: string[] = [];

  if (selectedNetworkClientId && networkController) {
    Object.values(
      networkController.networkConfigurationsByChainId ?? {},
    ).forEach((configuration) => {
      configuration.rpcEndpoints?.forEach((endpoint) => {
        if (
          endpoint.networkClientId === selectedNetworkClientId &&
          endpoint.url
        ) {
          selectedRpcUrls.push(endpoint.url);
        }
      });
    });
  }

  return {
    enabled: state.settings?.basicFunctionalityEnabled !== false,
    selectedRpcUrls,
  };
}
