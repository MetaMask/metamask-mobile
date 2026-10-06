import { act } from '@testing-library/react-native';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import {
  MOCK_INTERNAL_ACCOUNT,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { useUsdcBalance } from './useUsdcBalance';
import { SOLANA_USDC_ASSET_ID } from '../constants';

let mockAssetsBalance: AssetsControllerState['assetsBalance'] = {};

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
const mockAccountByScope = jest.fn();

describe('useUsdcBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
