import { act, waitFor } from '@testing-library/react-native';
import { handleFetch } from '@metamask/controller-utils';
import {
  useTokensData,
  isRwaChecked,
  getCheckedRwaData,
  MAX_BATCH_SIZE,
  FetchTokensOptions,
} from './useTokensData';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

const mockHandleFetch = handleFetch as jest.Mock;

const TOKEN_NAME_MOCK = 'Test Token';
const TOKEN_SYMBOL_MOCK = 'TT';
const TOKEN_ICON_URL_MOCK = 'https://example.com/icon.png';

// Each test gets a unique asset ID to avoid module-level cache pollution.
let assetIdCounter = 0;
const makeAssetId = () =>
  `eip155:1/erc20:0x${(++assetIdCounter).toString().padStart(40, '0')}`;

function makeTokenResponse(assetId: string) {
  return [
    {
      assetId,
      name: TOKEN_NAME_MOCK,
      symbol: TOKEN_SYMBOL_MOCK,
      iconUrl: TOKEN_ICON_URL_MOCK,
    },
  ];
}

function renderHook(assetIds: string[], options?: FetchTokensOptions) {
  return renderHookWithProvider(() => useTokensData(assetIds, options), {
    state: {},
  });
}

describe('useTokensData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty tokens and isLoading true initially before fetch resolves', () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result } = renderHook([assetId]);

    expect(result.current.tokens).toEqual({});
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('returns token data and isLoading false after fetch resolves', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result } = renderHook([assetId]);

    await waitFor(() => {
      expect(result.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  it('returns symbol and iconUrl after fetch resolves', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result } = renderHook([assetId]);

    await waitFor(() => {
      expect(result.current.tokens[assetId]?.symbol).toBe(TOKEN_SYMBOL_MOCK);
      expect(result.current.tokens[assetId]?.iconUrl).toBe(TOKEN_ICON_URL_MOCK);
    });
  });

  it('returns empty tokens and isLoading false when fetch fails', async () => {
    mockHandleFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook([makeAssetId()]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.tokens).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('returns empty tokens and isLoading false when assetIds is empty', () => {
    const { result } = renderHook([]);

    expect(result.current.tokens).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  it('calls API with correct URL including assetIds and includeIconUrl', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    renderHook([assetId]);

    await waitFor(() => {
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });

    const calledUrl = mockHandleFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tokens.api.cx.metamask.io/v3/assets');
    expect(calledUrl).toContain(encodeURIComponent(assetId));
    expect(calledUrl).toContain('includeIconUrl=true');
  });

  // Note: this test produces one act() warning because each renderHook call creates
  // an independent React tree. When the shared in-flight promise resolves, all three
  // trees update simultaneously, but only the one observed by waitFor is wrapped in act.
  // This is a known RNTL limitation when testing cross-hook module-level state sharing.
  it('deduplicates concurrent requests for the same asset IDs', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result: r1 } = renderHook([assetId]);
    const { result: r2 } = renderHook([assetId]);
    const { result: r3 } = renderHook([assetId]);

    await waitFor(() => {
      expect(r1.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
      expect(r2.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
      expect(r3.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
    });

    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
  });

  it('returns cached data synchronously on second mount without re-fetching', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result: result1 } = renderHook([assetId]);
    await waitFor(() => {
      expect(result1.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
    });

    mockHandleFetch.mockClear();
    const { result: result2 } = renderHook([assetId]);

    expect(result2.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK);
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.hasError).toBe(false);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  it('hydrates tokens from cache when assetIds change to an already-cached set', async () => {
    const assetIdA = makeAssetId();
    const assetIdB = makeAssetId();
    // The hex address survives URL-encoding (the CAIP prefix's ":" and "/" do not),
    // so match on it to decide which token the mocked request resolves.
    const addressB = assetIdB.split('erc20:')[1];
    mockHandleFetch.mockImplementation((url: string) =>
      Promise.resolve(
        makeTokenResponse(url.includes(addressB) ? assetIdB : assetIdA),
      ),
    );

    // Prime the module-level cache for B in a separate instance.
    const { result: priming } = renderHook([assetIdB]);
    await waitFor(() => {
      expect(priming.current.tokens[assetIdB]?.name).toBe(TOKEN_NAME_MOCK);
    });

    // This instance starts on A, then switches to the already-cached B.
    let ids = [assetIdA];
    const { result, rerender } = renderHookWithProvider(
      () => useTokensData(ids),
      { state: {} },
    );
    await waitFor(() => {
      expect(result.current.tokens[assetIdA]?.name).toBe(TOKEN_NAME_MOCK);
    });

    ids = [assetIdB];
    act(() => {
      rerender(undefined);
    });

    await waitFor(() => {
      expect(result.current.tokens[assetIdB]?.name).toBe(TOKEN_NAME_MOCK);
      expect(result.current.tokens[assetIdA]).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  it('looks up token by lowercase key when API returns checksummed assetId', async () => {
    const lowercaseId = makeAssetId(); // already lowercase from makeAssetId
    const checksummedId = lowercaseId.replace(/0x[0-9a-f]+/, (m) =>
      m.replace(/[a-f]/g, (c) => c.toUpperCase()),
    );

    // API echoes back the checksummed version of the asset ID
    mockHandleFetch.mockResolvedValue([
      {
        assetId: checksummedId,
        name: TOKEN_NAME_MOCK,
        symbol: TOKEN_SYMBOL_MOCK,
        iconUrl: TOKEN_ICON_URL_MOCK,
      },
    ]);

    // Hook is called with the lowercase ID (as buildAssetId produces)
    const { result } = renderHook([lowercaseId]);

    await waitFor(() => {
      expect(result.current.tokens[lowercaseId]?.name).toBe(TOKEN_NAME_MOCK);
    });
  });

  it(`splits requests larger than ${MAX_BATCH_SIZE} into separate batches`, async () => {
    const assetIds = Array.from({ length: MAX_BATCH_SIZE + 1 }, () =>
      makeAssetId(),
    );

    mockHandleFetch.mockImplementation((url: string) => {
      const params = new URL(url).searchParams.get('assetIds') ?? '';
      return Promise.resolve(
        params.split(',').map((id) => ({
          assetId: id,
          name: TOKEN_NAME_MOCK,
          symbol: TOKEN_SYMBOL_MOCK,
          iconUrl: TOKEN_ICON_URL_MOCK,
        })),
      );
    });

    const { result } = renderHook(assetIds);

    await waitFor(() => {
      expect(Object.keys(result.current.tokens)).toHaveLength(assetIds.length);
    });

    expect(mockHandleFetch).toHaveBeenCalledTimes(2);

    const firstCallCount = (
      new URL(mockHandleFetch.mock.calls[0][0] as string).searchParams
        .get('assetIds')
        ?.split(',') ?? []
    ).length;
    const secondCallCount = (
      new URL(mockHandleFetch.mock.calls[1][0] as string).searchParams
        .get('assetIds')
        ?.split(',') ?? []
    ).length;

    expect(firstCallCount).toBe(MAX_BATCH_SIZE);
    expect(secondCallCount).toBe(1);
  });

  it('includes includeRwaData=true in the URL when option is set', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    renderHook([assetId], { includeRwaData: true });

    await waitFor(() => {
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });

    const calledUrl = mockHandleFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('includeRwaData=true');
  });

  it('does not include includeRwaData in the URL by default', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    renderHook([assetId]);

    await waitFor(() => {
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });

    const calledUrl = mockHandleFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('includeRwaData');
  });

  it('does not share cache between requests with and without includeRwaData', async () => {
    const assetId = makeAssetId();
    const rwaData = { instrumentType: 'stock' };
    mockHandleFetch
      .mockResolvedValueOnce(makeTokenResponse(assetId))
      .mockResolvedValueOnce([{ ...makeTokenResponse(assetId)[0], rwaData }]);

    const { result: r1 } = renderHook([assetId]);
    await waitFor(() =>
      expect(r1.current.tokens[assetId]?.name).toBe(TOKEN_NAME_MOCK),
    );
    expect(r1.current.tokens[assetId]?.rwaData).toBeUndefined();

    mockHandleFetch.mockClear();
    const { result: r2 } = renderHook([assetId], { includeRwaData: true });
    await waitFor(() =>
      expect(r2.current.tokens[assetId]?.rwaData).toEqual(rwaData),
    );

    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
  });

  it('isRwaChecked returns true after fetching with includeRwaData', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    expect(isRwaChecked(assetId)).toBe(false);

    const { result } = renderHook([assetId], { includeRwaData: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(isRwaChecked(assetId)).toBe(true);
  });

  it('isRwaChecked returns false for tokens fetched without includeRwaData', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result } = renderHook([assetId]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(isRwaChecked(assetId)).toBe(false);
  });

  it('getCheckedRwaData returns cached rwaData after fetch with includeRwaData', async () => {
    const assetId = makeAssetId();
    const rwaData = { instrumentType: 'stock' };
    mockHandleFetch.mockResolvedValue([
      { ...makeTokenResponse(assetId)[0], rwaData },
    ]);

    expect(getCheckedRwaData(assetId)).toBeUndefined();

    const { result } = renderHook([assetId], { includeRwaData: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCheckedRwaData(assetId)).toEqual(rwaData);
  });

  it('getCheckedRwaData returns undefined for a confirmed non-RWA token', async () => {
    const assetId = makeAssetId();
    mockHandleFetch.mockResolvedValue(makeTokenResponse(assetId));

    const { result } = renderHook([assetId], { includeRwaData: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(isRwaChecked(assetId)).toBe(true);
    expect(getCheckedRwaData(assetId)).toBeUndefined();
  });

  it('getCheckedRwaData resolves from cache even when the asset is not in the current request', async () => {
    const assetId = makeAssetId();
    const otherAssetId = makeAssetId();
    const rwaData = { instrumentType: 'bond' };

    // First request confirms the RWA and populates the module-level cache.
    mockHandleFetch.mockResolvedValue([
      { ...makeTokenResponse(assetId)[0], rwaData },
    ]);
    const { result: r1 } = renderHook([assetId], { includeRwaData: true });
    await waitFor(() => expect(r1.current.isLoading).toBe(false));

    // A later request for a different asset (simulating the confirmed asset
    // being excluded from re-fetch) must not erase access to the cached rwaData.
    mockHandleFetch.mockResolvedValue(makeTokenResponse(otherAssetId));
    const { result: r2 } = renderHook([otherAssetId], { includeRwaData: true });
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(getCheckedRwaData(assetId)).toEqual(rwaData);
  });
});
