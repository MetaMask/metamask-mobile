import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '.';
import { constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../Tokens/util', () => ({
  ...jest.requireActual('../../../Tokens/util'),
  sortAssets: jest.fn().mockImplementation((assets) => assets),
}));

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
      const nativeToken = result.current.find(
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
        balanceFiat: '$6000',
        tokenFiatAmount: 6000,
      });
    });
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
      const token1 = result.current.find(
        (t) => t.address === token1Address && t.chainId === mockChainId,
      );
      const token2 = result.current.find(
        (t) => t.address === token2Address && t.chainId === mockChainId,
      );

      expect(token1).toMatchObject({
        balance: '1.0',
        balanceFiat: '$20000',
        tokenFiatAmount: 20000,
      });

      expect(token2).toMatchObject({
        balance: '2.0',
        balanceFiat: '$200000',
        tokenFiatAmount: 200000,
      });

      // Optimism chain tokens
      const optimismNative = result.current.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === optimismChainId,
      );
      expect(optimismNative).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        chainId: optimismChainId,
        balance: '20.0',
        balanceFiat: '$40000',
        tokenFiatAmount: 40000,
      });

      const token3 = result.current.find((t) => t.address === token3Address);
      expect(token3).toMatchObject({
        address: token3Address,
        symbol: 'FOO',
        name: 'Foo Token',
        chainId: optimismChainId,
        balance: '5.0',
        balanceFiat: '$80000',
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
      const ethereumNative = result.current.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === mockChainId,
      );
      const token1 = result.current.find((t) => t.address === token1Address);
      const token2 = result.current.find((t) => t.address === token2Address);

      expect(ethereumNative).toBeTruthy();
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();

      // Optimism tokens should not be present
      const optimismNative = result.current.find(
        (token) =>
          token.address === constants.AddressZero &&
          token.chainId === optimismChainId,
      );
      const token3 = result.current.find((t) => t.address === token3Address);

      expect(optimismNative).toBeUndefined();
      expect(token3).toBeUndefined();

      // Verify the total number of tokens is correct (should only have Ethereum tokens)
      expect(result.current.length).toBe(3); // ETH native + TOKEN1 + TOKEN2
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
      const token1 = result.current.find((t) => t.address === token1Address);
      expect(token1?.balanceFiat).toBe('$0');

      const token3 = result.current.find((t) => t.address === token3Address);
      expect(token3?.balanceFiat).toBe('$0');
    });
  });
});
