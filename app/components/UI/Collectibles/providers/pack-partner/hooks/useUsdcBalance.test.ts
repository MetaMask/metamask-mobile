import { act, waitFor } from '@testing-library/react-native';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../../../core/Engine';
import { apiClient } from '../../../../../../core/apiClient';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import {
  MOCK_INTERNAL_ACCOUNT,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { useUsdcBalance } from './useUsdcBalance';
import { PACK_PARTNER_ENVIRONMENTS } from '../constants/environment';
import { SOLANA_USDC_ASSET_ID } from '../constants/packPartner';

const mockEnvironment = jest.requireMock<
  typeof import('../constants/environment')
>('../constants/environment');
let mockAssetsBalance: AssetsControllerState['assetsBalance'] = {};

jest.mock('../constants/environment', () => ({
  __esModule: true,
  ...jest.requireActual('../constants/environment'),
}));

jest.mock('../../../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      fetchV6MultiAccountBalances: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AssetsController: {
        getAssets: jest.fn(),
        get state() {
          return { assetsBalance: mockAssetsBalance };
        },
      },
    },
  },
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);
const mockFetchBalances = jest.mocked(
  apiClient.accounts.fetchV6MultiAccountBalances,
);
const mockAccountByScope = jest.fn();

const createDevnetBalances = (
  amount: string,
  address = MOCK_INTERNAL_ACCOUNT.address,
): Awaited<
  ReturnType<typeof apiClient.accounts.fetchV6MultiAccountBalances>
> => ({
  unprocessedNetworks: [],
  unprocessedIncludeAssetIds: [],
  balances: [
    {
      accountId: `${SolScope.Devnet}:${address}`,
      object: 'token',
      type: 'spl',
      assetId: `${SolScope.Mainnet}/token:${PACK_PARTNER_ENVIRONMENTS.devnet.usdcMint}`,
      name: 'USDC Dev',
      symbol: 'USDC',
      decimals: 6,
      balance: amount,
    },
  ],
});

describe('useUsdcBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchBalances.mockReset();
    jest.replaceProperty(
      mockEnvironment,
      'PACK_PARTNER_ENVIRONMENT',
      'mainnet',
    );
    mockAssetsBalance = {};
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
  });

  it('reads the Solana USDC balance of the selected account', () => {
    const { result } = renderHookWithQueryClient(() => useUsdcBalance(), {
      state: createTestState({ usdcAmount: '12.5' }),
    });

    expect(result.current.baseUnits).toBe(12_500_000n);
    expect(result.current.formatted).toBe('12.50');
    expect(mockFetchBalances).not.toHaveBeenCalled();
  });

  it('returns zero when the account never held USDC', () => {
    const { result } = renderHookWithQueryClient(() => useUsdcBalance(), {
      state: createTestState(),
    });

    expect(result.current.baseUnits).toBe(0n);
    expect(result.current.formatted).toBe('0.00');
  });

  it('force-refreshes the Solana fungible balances', async () => {
    mockGetAssets.mockResolvedValue({});
    const { result } = renderHookWithQueryClient(() => useUsdcBalance());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).toHaveBeenCalledWith([MOCK_INTERNAL_ACCOUNT], {
      forceUpdate: true,
      bypassServerCache: true,
      chainIds: [SolScope.Mainnet],
      assetTypes: ['fungible'],
    });
    expect(mockFetchBalances).not.toHaveBeenCalled();
  });

  it('returns the refreshed controller balance instead of the stale Redux balance', async () => {
    mockGetAssets.mockImplementation(async () => {
      mockAssetsBalance = {
        [MOCK_INTERNAL_ACCOUNT.id]: {
          [SOLANA_USDC_ASSET_ID]: { amount: '50.123456' },
        },
      };
      return {};
    });
    const { result } = renderHookWithQueryClient(() => useUsdcBalance(), {
      state: createTestState({ usdcAmount: '20' }),
    });

    await act(async () => {
      await expect(result.current.refresh()).resolves.toBe(50_123_456n);
    });

    expect(result.current.baseUnits).toBe(20_000_000n);
  });

  it('returns a hidden USDC balance that getAssets omits, as displayed', async () => {
    mockAssetsBalance = {
      [MOCK_INTERNAL_ACCOUNT.id]: {
        [SOLANA_USDC_ASSET_ID]: { amount: '30' },
      },
    };
    mockGetAssets.mockResolvedValue({ [MOCK_INTERNAL_ACCOUNT.id]: {} });
    const { result } = renderHookWithQueryClient(() => useUsdcBalance(), {
      state: createTestState({ usdcAmount: '30' }),
    });

    let refreshed: bigint | undefined;
    await act(async () => {
      refreshed = await result.current.refresh();
    });

    expect(refreshed).toBe(30_000_000n);
    expect(refreshed).toBe(result.current.baseUnits);
  });

  it('returns zero when the refreshed account has no USDC balance', async () => {
    mockGetAssets.mockResolvedValue({ [MOCK_INTERNAL_ACCOUNT.id]: {} });
    const { result } = renderHookWithQueryClient(() => useUsdcBalance());

    await act(async () => {
      await expect(result.current.refresh()).resolves.toBe(0n);
    });
  });

  it('swallows refresh failures', async () => {
    mockGetAssets.mockRejectedValue(new Error('offline'));
    const { result } = renderHookWithQueryClient(() => useUsdcBalance());

    await act(async () => {
      await expect(result.current.refresh()).resolves.toBeUndefined();
    });
  });

  it('does not refresh without a Solana account', async () => {
    mockAccountByScope.mockReturnValue(undefined);
    const { result } = renderHookWithQueryClient(() => useUsdcBalance());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  describe('Devnet', () => {
    beforeEach(() => {
      jest.replaceProperty(
        mockEnvironment,
        'PACK_PARTNER_ENVIRONMENT',
        'devnet',
      );
    });

    it('reads the selected address through the Assets API', async () => {
      mockFetchBalances.mockResolvedValue(createDevnetBalances('12.345678'));

      const { result } = renderHookWithQueryClient(() => useUsdcBalance(), {
        state: createTestState({ usdcAmount: '99' }),
      });

      await waitFor(() => {
        expect(result.current.baseUnits).toBe(12_345_678n);
      });
      expect(result.current.formatted).toBe('12.345678');
      expect(mockFetchBalances).toHaveBeenCalledWith(
        [`${SolScope.Devnet}:${MOCK_INTERNAL_ACCOUNT.address}`],
        expect.objectContaining({ networks: [SolScope.Devnet] }),
        expect.objectContaining({ bypassServerCache: true }),
      );
      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('returns the refreshed API balance in atomic units', async () => {
      mockFetchBalances.mockResolvedValue(createDevnetBalances('12.5'));
      const { result } = renderHookWithQueryClient(() => useUsdcBalance());
      await waitFor(() => {
        expect(result.current.baseUnits).toBe(12_500_000n);
      });
      mockFetchBalances.mockResolvedValue(createDevnetBalances('50.123456'));

      await act(async () => {
        await expect(result.current.refresh()).resolves.toBe(50_123_456n);
      });

      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('returns undefined when refreshing the API balance fails', async () => {
      mockFetchBalances.mockResolvedValue(createDevnetBalances('12.5'));
      const { result } = renderHookWithQueryClient(() => useUsdcBalance());
      await waitFor(() => {
        expect(result.current.baseUnits).toBe(12_500_000n);
      });
      mockFetchBalances.mockRejectedValue(new Error('offline'));

      await act(async () => {
        await expect(result.current.refresh()).resolves.toBeUndefined();
      });

      expect(result.current.baseUnits).toBe(12_500_000n);
      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('does not query without a selected account', async () => {
      mockAccountByScope.mockReturnValue(undefined);

      const { result } = renderHookWithQueryClient(() => useUsdcBalance());
      await act(async () => {
        await expect(result.current.refresh()).resolves.toBeUndefined();
      });

      expect(result.current.baseUnits).toBe(0n);
      expect(mockFetchBalances).not.toHaveBeenCalled();
      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('reads a changed address even when the account id stays the same', async () => {
      mockFetchBalances.mockResolvedValue(createDevnetBalances('12.5'));
      const { result, unmount, queryClient } = renderHookWithQueryClient(() =>
        useUsdcBalance(),
      );
      await waitFor(() => {
        expect(result.current.baseUnits).toBe(12_500_000n);
      });
      unmount();
      const changedAddress = '11111111111111111111111111111111';
      mockAccountByScope.mockReturnValue({
        ...MOCK_INTERNAL_ACCOUNT,
        address: changedAddress,
      });
      mockFetchBalances.mockResolvedValue(
        createDevnetBalances('3', changedAddress),
      );

      const changedAccount = renderHookWithQueryClient(() => useUsdcBalance(), {
        queryClient,
      });

      await waitFor(() => {
        expect(changedAccount.result.current.baseUnits).toBe(3_000_000n);
      });
      expect(mockFetchBalances).toHaveBeenLastCalledWith(
        [`${SolScope.Devnet}:${changedAddress}`],
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
