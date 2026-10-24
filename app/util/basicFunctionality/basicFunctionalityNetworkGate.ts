import type { RootState } from '../../reducers';
import {
  getBasicFunctionalityGateState,
  isBasicFunctionalityRequestBlocked,
  readBasicFunctionalityGateState,
  registerBasicFunctionalityGateReader,
  resetBasicFunctionalityGateReader,
  type BasicFunctionalityGateState,
} from './basicFunctionalityRequestPolicy';

let installed = false;
let originalFetch: typeof fetch | undefined;

function readRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  if (typeof input === 'object' && input !== null && 'url' in input) {
    return String(input.url);
  }
  return '';
}

function readGateStateFromStore(): BasicFunctionalityGateState {
  try {
    // Lazy require avoids a cycle: store -> rootSaga -> this module -> store.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { store } = require('../../store') as {
      store: { getState: () => RootState };
    };
    return readBasicFunctionalityGateState(store.getState());
  } catch {
    return { enabled: true, selectedRpcUrls: [] };
  }
}

/**
 * Fetch wrapper that drops MetaMask service calls while basic functionality
 * is off and still forwards the selected network RPC.
 */
export function createBasicFunctionalityFetch(
  baseFetch: typeof fetch,
  readState: () => BasicFunctionalityGateState,
): typeof fetch {
  return (input, init) => {
    const state = readState();
    const url = readRequestUrl(input);

    if (
      !state.enabled &&
      isBasicFunctionalityRequestBlocked(url, state.selectedRpcUrls)
    ) {
      const error = new Error(`Disallowed URL: ${url}`);
      console.error(error);
      return Promise.reject(error);
    }

    return baseFetch(input, init);
  };
}

/**
 * Installs the fetch gate once. Later calls only refresh the state reader.
 */
export function installBasicFunctionalityNetworkGate(): void {
  registerBasicFunctionalityGateReader(readGateStateFromStore);

  if (installed || typeof global.fetch !== 'function') {
    return;
  }

  originalFetch = global.fetch.bind(global);
  global.fetch = createBasicFunctionalityFetch(
    originalFetch,
    getBasicFunctionalityGateState,
  );
  installed = true;
}

export function uninstallBasicFunctionalityNetworkGate(): void {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  originalFetch = undefined;
  installed = false;
  resetBasicFunctionalityGateReader();
}
