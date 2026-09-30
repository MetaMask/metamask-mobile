import { act } from '@testing-library/react-native';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import {
  MOCK_INTERNAL_ACCOUNT,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { useUsdcBalance } from './useUsdcBalance';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { AssetsController: { getAssets: jest.fn() } } },
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
