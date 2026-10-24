import {
  createBasicFunctionalityFetch,
  installBasicFunctionalityNetworkGate,
  uninstallBasicFunctionalityNetworkGate,
} from './basicFunctionalityNetworkGate';
import {
  registerBasicFunctionalityGateReader,
  resetBasicFunctionalityGateReader,
  type BasicFunctionalityGateState,
} from './basicFunctionalityRequestPolicy';

const SELECTED_INFURA_URL = 'https://mainnet.infura.io/v3/{infuraProjectId}';
const RESOLVED_INFURA_URL = 'https://mainnet.infura.io/v3/project-id';
const TOKEN_API_URL = 'https://tokens.api.cx.metamask.io/v3/assets';

describe('createBasicFunctionalityFetch', () => {
  const baseFetch = jest
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('ok'));

  beforeEach(() => {
    baseFetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards token and price requests when basic functionality is on', async () => {
    const gatedFetch = createBasicFunctionalityFetch(baseFetch, () => ({
      enabled: true,
      selectedRpcUrls: [SELECTED_INFURA_URL],
    }));

    await gatedFetch(TOKEN_API_URL);

    expect(baseFetch).toHaveBeenCalledWith(TOKEN_API_URL, undefined);
  });

  it('rejects MetaMask service requests when basic functionality is off', async () => {
    const gatedFetch = createBasicFunctionalityFetch(baseFetch, () => ({
      enabled: false,
      selectedRpcUrls: [SELECTED_INFURA_URL],
    }));

    await expect(gatedFetch(TOKEN_API_URL)).rejects.toThrow(
      `Disallowed URL: ${TOKEN_API_URL}`,
    );
    expect(baseFetch).not.toHaveBeenCalled();
  });

  it('forwards the selected RPC when basic functionality is off', async () => {
    const gatedFetch = createBasicFunctionalityFetch(baseFetch, () => ({
      enabled: false,
      selectedRpcUrls: [SELECTED_INFURA_URL],
    }));

    await gatedFetch(RESOLVED_INFURA_URL, {
      method: 'POST',
      body: JSON.stringify({ method: 'eth_blockNumber' }),
    });

    expect(baseFetch).toHaveBeenCalledWith(
      RESOLVED_INFURA_URL,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('installBasicFunctionalityNetworkGate', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    uninstallBasicFunctionalityNetworkGate();
    global.fetch = originalFetch;
    resetBasicFunctionalityGateReader();
  });

  it('uses the registered reader for later fetches', async () => {
    const baseFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('ok'));
    global.fetch = baseFetch;
    const state: BasicFunctionalityGateState = {
      enabled: false,
      selectedRpcUrls: [SELECTED_INFURA_URL],
    };

    installBasicFunctionalityNetworkGate();
    registerBasicFunctionalityGateReader(() => state);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(global.fetch(TOKEN_API_URL)).rejects.toThrow(
      `Disallowed URL: ${TOKEN_API_URL}`,
    );
    await global.fetch(RESOLVED_INFURA_URL);

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(baseFetch).toHaveBeenCalledWith(RESOLVED_INFURA_URL, undefined);
  });
});
