import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '.';
import { constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { handleFetch } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../Tokens/util', () => ({
  ...jest.requireActual('../../../Tokens/util'),
  sortAssets: jest.fn().mockImplementation((assets) => assets),
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn().mockResolvedValue([]),
}));

const mockHandleFetch = handleFetch as jest.Mock;

describe('useTokensWithBalance', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const solanaChainId = SolScope.Mainnet;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;
  const token3Address = '0x0000000000000000000000000000000000000003' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleFetch.mockResolvedValue([]);
  });

  it('should include native token with correct properties', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId, optimismChainId, solanaChainId],
        }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      const nativeToken = result.current.tokens.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === mockChainId,
      );
      expect(nativeToken).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: mockChainId,
        balance: '3.0',
        balanceFiat: '$6,000.00',
        tokenFiatAmount: 6000,
      });
    });
  });

  it('does not fetch RWA data by default', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId],
        }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current.tokens.length).toBeGreaterThan(0);
    });

    expect(result.current.isExtraTokenDataLoading).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  it('should show correct balances and fiat values for tokens', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId, optimismChainId, solanaChainId],
        }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      // Ethereum chain tokens
      const token1 = result.current.tokens.find(
        (t) => t.address === token1Address && t.chainId === mockChainId,
      );
      const token2 = result.current.tokens.find(
        (t) => t.address === token2Address && t.chainId === mockChainId,
      );

      expect(token1).toMatchObject({
        balance: '1.0',
        balanceFiat: '$20,000.00',
        tokenFiatAmount: 20000,
      });

      expect(token2).toMatchObject({
        balance: '2.0',
        balanceFiat: '$200,000.00',
        tokenFiatAmount: 200000,
      });

      // Optimism chain tokens
      const optimismNative = result.current.tokens.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === optimismChainId,
      );
      expect(optimismNative).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        chainId: optimismChainId,
        balance: '20.0',
        balanceFiat: '$40,000.00',
        tokenFiatAmount: 40000,
      });

      const token3 = result.current.tokens.find(
        (t) => t.address === token3Address,
      );
      expect(token3).toMatchObject({
        address: token3Address,
        symbol: 'FOO',
        name: 'Foo Token',
        chainId: optimismChainId,
        balance: '5.0',
        balanceFiat: '$80,000.00',
        tokenFiatAmount: 80000,
      });
    });
  });

  it('should only show tokens for selected chains', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId],
        }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      // Ethereum tokens should be present
      const ethereumNative = result.current.tokens.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === mockChainId,
      );
      const token1 = result.current.tokens.find(
        (t) => t.address === token1Address,
      );
      const token2 = result.current.tokens.find(
        (t) => t.address === token2Address,
      );

      expect(ethereumNative).toBeTruthy();
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();

      // Optimism tokens should not be present
      const optimismNative = result.current.tokens.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === optimismChainId,
      );
      const token3 = result.current.tokens.find(
        (t) => t.address === token3Address,
      );

      expect(optimismNative).toBeUndefined();
      expect(token3).toBeUndefined();

      // Verify the total number of tokens is correct (should only have Ethereum tokens)
      expect(result.current.tokens.length).toBe(3); // ETH native + TOKEN1 + TOKEN2
    });
  });

  it('should filter out zero-balance tokens', async () => {
    const stateWithZeroBalances = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountTrackerController: {
            accountsByChainId: {
              ...initialState.engine.backgroundState.AccountTrackerController
                .accountsByChainId,
              [mockChainId]: {
                [mockAddress]: {
                  balance: '0x0' as Hex,
                },
              },
            },
          },
          TokenBalancesController: {
            tokenBalances: {
              [mockAddress]: {
                [mockChainId]: {
                  [token1Address]: '0x0de0b6b3a7640000' as Hex /* 1 TOKEN1 */,
                  [token2Address]: '0x0' as Hex,
                },
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId],
        }),
      {
        state: stateWithZeroBalances,
      },
    );

    await waitFor(() => {
      const ethereumNative = result.current.tokens.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === mockChainId,
      );
      const token1 = result.current.tokens.find(
        (t) => t.address === token1Address,
      );
      const token2 = result.current.tokens.find(
        (t) => t.address === token2Address,
      );

      expect(ethereumNative).toBeUndefined();
      expect(token1).toMatchObject({
        balance: '1.0',
      });
      expect(token2).toBeUndefined();
      expect(result.current.tokens.length).toBe(1);
    });
  });

  it('should format small fiat values correctly', async () => {
    const stateWithSmallBalance = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenBalancesController: {
            tokenBalances: {
              [mockAddress]: {
                [mockChainId]: {
                  [token1Address]: '0x1' as Hex, // Very small amount
                },
                [optimismChainId]: {
                  [token3Address]: '0x1' as Hex, // Very small amount on Optimism
                },
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () =>
        useTokensWithBalance({
          chainIds: [mockChainId, optimismChainId],
        }),
      {
        state: stateWithSmallBalance,
      },
    );

    await waitFor(() => {
      const token1 = result.current.tokens.find(
        (t) => t.address === token1Address,
      );
      expect(token1?.balanceFiat).toBe('$0.00');

      const token3 = result.current.tokens.find(
        (t) => t.address === token3Address,
      );
      expect(token3?.balanceFiat).toBe('$0.00');
    });
  });

  describe('rwaData enrichment', () => {
    // token1 on Ethereum, lowercased CAIP-19 asset ID as built by the hook.
    const token1AssetId = `eip155:1/erc20:${token1Address}`.toLowerCase();
    const rwaData = { instrumentType: 'stock' };

    it('enriches tokens with rwaData fetched from the API', async () => {
      mockHandleFetch.mockResolvedValue([
        {
          assetId: token1AssetId,
          name: 'Token 1',
          symbol: 'T1',
          iconUrl: '',
          rwaData,
        },
      ]);

      const { result } = renderHookWithProvider(
        () =>
          useTokensWithBalance(
            {
              chainIds: [mockChainId],
            },
            { shouldFetchExtraTokenData: true },
          ),
        { state: initialState },
      );

      await waitFor(() => {
        const token1 = result.current.tokens.find(
          (t) => t.address === token1Address,
        );
        expect(token1?.rwaData).toEqual(rwaData);
      });
    });

    it('keeps rwaData on remount when the asset is excluded from re-fetch', async () => {
      // First mount confirms token1 as an RWA and populates the module-level cache.
      mockHandleFetch.mockResolvedValue([
        {
          assetId: token1AssetId,
          name: 'Token 1',
          symbol: 'T1',
          iconUrl: '',
          rwaData,
        },
      ]);

      const first = renderHookWithProvider(
        () =>
          useTokensWithBalance(
            {
              chainIds: [mockChainId],
            },
            { shouldFetchExtraTokenData: true },
          ),
        { state: initialState },
      );

      await waitFor(() => {
        const token1 = first.result.current.tokens.find(
          (t) => t.address === token1Address,
        );
        expect(token1?.rwaData).toEqual(rwaData);
      });

      first.unmount();

      // On remount token1 is cache-confirmed, so it is excluded from the fetch
      // (which now returns nothing). rwaData must still resolve from the cache.
      mockHandleFetch.mockResolvedValue([]);

      const second = renderHookWithProvider(
        () =>
          useTokensWithBalance(
            {
              chainIds: [mockChainId],
            },
            { shouldFetchExtraTokenData: true },
          ),
        { state: initialState },
      );

      await waitFor(() => {
        const token1 = second.result.current.tokens.find(
          (t) => t.address === token1Address,
        );
        expect(token1?.rwaData).toEqual(rwaData);
      });
    });
  });
});
