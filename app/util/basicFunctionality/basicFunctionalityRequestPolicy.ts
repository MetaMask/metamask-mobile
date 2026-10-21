import type { RootState } from '../../reducers';

const LOCAL_HARNESS_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.0.2.2',
  'bs-local.com',
]);

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
 * Follow a mock-server `/proxy?url=` wrapper to the real destination.
 * The E2E shim rewrites fetches to that shape.
 */
export function unwrapProxiedRequestUrl(requestUrl: string): string {
  try {
    const parsed = new URL(requestUrl);
    const innerUrl = parsed.searchParams.get('url');
    if (innerUrl && parsed.pathname.includes('/proxy')) {
      return unwrapProxiedRequestUrl(innerUrl);
    }
  } catch {
    return requestUrl;
  }
  return requestUrl;
}

function isLocalHarnessUrl(requestUrl: string): boolean {
  try {
    return LOCAL_HARNESS_HOSTS.has(new URL(requestUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * True when basic functionality is off and this URL is anything other than
 * the selected RPC. JSON-RPC methods share that URL, so eth_chainId,
 * eth_blockNumber, eth_getBalance, and fee methods stay allowed together.
 * Local test-harness hosts stay open so the device can reach the mock server.
 */
export function isBasicFunctionalityRequestBlocked(
  requestUrl: string,
  selectedRpcUrls: string[],
): boolean {
  const targetUrl = unwrapProxiedRequestUrl(requestUrl);
  if (requestMatchesSelectedRpc(targetUrl, selectedRpcUrls)) {
    return false;
  }
  if (isLocalHarnessUrl(targetUrl)) {
    return false;
  }
  return true;
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
