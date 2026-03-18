import { act, waitFor } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NameType } from '../../UI/Name/Name.types';
import { useERC20Tokens } from './useERC20Tokens';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

const TOKEN_NAME_MOCK = 'Test Token';
const TOKEN_SYMBOL_MOCK = 'TT';
const TOKEN_ICON_URL_MOCK = 'https://example.com/icon.png';
// CHAIN_IDS.MAINNET = '0x1' → decimal 1
const CHAIN_ID_MOCK = CHAIN_IDS.MAINNET;

// Each test gets a unique address to avoid module-level cache pollution.
let addressCounter = 0;
const makeAddress = () =>
  `0x${(++addressCounter).toString().padStart(40, '0')}`;
const makeAssetId = (address: string) =>
  `eip155:1/erc20:${address.toLowerCase()}`;

function makeTokenResponse(address: string) {
  return [
    {
      assetId: makeAssetId(address),
      name: TOKEN_NAME_MOCK,
      symbol: TOKEN_SYMBOL_MOCK,
      iconUrl: TOKEN_ICON_URL_MOCK,
    },
  ];
}

function mockFetch(response: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    json: () => Promise.resolve(response),
    ok: true,
  } as Response);
}

function renderHook(requests: Parameters<typeof useERC20Tokens>[0]) {
  return renderHookWithProvider(() => useERC20Tokens(requests), { state: {} });
}

describe('useERC20Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined initially before fetch resolves', () => {
    mockFetch(makeTokenResponse(makeAddress()));

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: makeAddress(),
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]).toEqual({ name: undefined, image: undefined });
  });

  it('returns name after fetch resolves', async () => {
    const address = makeAddress();
    mockFetch(makeTokenResponse(address));

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    await waitFor(() => {
      expect(result.current[0]?.name).toBe(TOKEN_NAME_MOCK);
    });
  });

  it('returns symbol when preferContractSymbol is true', async () => {
    const address = makeAddress();
    mockFetch(makeTokenResponse(address));

    const { result } = renderHook([
      {
        preferContractSymbol: true,
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    await waitFor(() => {
      expect(result.current[0]?.name).toBe(TOKEN_SYMBOL_MOCK);
    });
  });

  it('returns image after fetch resolves', async () => {
    const address = makeAddress();
    mockFetch(makeTokenResponse(address));

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    await waitFor(() => {
      expect(result.current[0]?.image).toBe(TOKEN_ICON_URL_MOCK);
    });
  });

  it('returns undefined if type is not EthereumAddress', () => {
    const { result } = renderHook([
      {
        type: 'alternateType' as NameType,
        value: makeAddress(),
        variation: CHAIN_ID_MOCK,
      },
    ]);

    expect(result.current[0]).toBeUndefined();
  });

  it('normalizes addresses to lowercase', async () => {
    const address = makeAddress();
    mockFetch(makeTokenResponse(address));

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: address.toUpperCase(),
        variation: CHAIN_ID_MOCK,
      },
    ]);

    await waitFor(() => {
      expect(result.current[0]?.name).toBe(TOKEN_NAME_MOCK);
    });
  });

  it('returns undefined if fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook([
      {
        type: NameType.EthereumAddress,
        value: makeAddress(),
        variation: CHAIN_ID_MOCK,
      },
    ]);

    // Give fetch time to fail, state should remain empty
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current[0]).toEqual({ name: undefined, image: undefined });
  });

  it('uses correct API URL with comma-separated assetIds', async () => {
    const address = makeAddress();
    const fetchMock = mockFetch(makeTokenResponse(address));

    renderHook([
      {
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tokens.api.cx.metamask.io/v3/assets');
    expect(calledUrl).toContain(encodeURIComponent(makeAssetId(address)));
    expect(calledUrl).toContain('includeIconUrl=true');
  });

  // Note: this test produces one act() warning because each renderHook call creates
  // an independent React tree. When the shared in-flight promise resolves, all three
  // trees update simultaneously, but only the one observed by waitFor is wrapped in act.
  // This is a known RNTL limitation when testing cross-hook module-level state sharing.
  it('deduplicates concurrent requests for the same token', async () => {
    const address = makeAddress();
    const fetchMock = mockFetch(makeTokenResponse(address));

    const request = [
      {
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ];

    const { result: r1 } = renderHook(request);
    const { result: r2 } = renderHook(request);
    const { result: r3 } = renderHook(request);

    await waitFor(() => {
      expect(r1.current[0]?.name).toBe(TOKEN_NAME_MOCK);
      expect(r2.current[0]?.name).toBe(TOKEN_NAME_MOCK);
      expect(r3.current[0]?.name).toBe(TOKEN_NAME_MOCK);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns cached data synchronously on second mount without re-fetching', async () => {
    const address = makeAddress();
    const fetchMock = mockFetch(makeTokenResponse(address));

    const request = [
      {
        type: NameType.EthereumAddress,
        value: address,
        variation: CHAIN_ID_MOCK,
      },
    ];

    // First mount populates the cache
    const { result: result1 } = renderHook(request);
    await waitFor(() => {
      expect(result1.current[0]?.name).toBe(TOKEN_NAME_MOCK);
    });

    // Second mount should read from cache synchronously without fetching
    fetchMock.mockClear();
    const { result: result2 } = renderHook(request);

    expect(result2.current[0]?.name).toBe(TOKEN_NAME_MOCK);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
