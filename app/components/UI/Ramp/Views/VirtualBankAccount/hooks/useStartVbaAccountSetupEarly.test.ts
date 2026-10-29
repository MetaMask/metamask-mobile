import { act, renderHook } from '@testing-library/react-native';
import { ensureMusdAutoramp } from '../ensureMusdAutoramp';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useVbaRegionSourceCurrency } from './useVbaRegionSourceCurrency';
import { useStartVbaAccountSetupEarly } from './useStartVbaAccountSetupEarly';

const WALLET_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';
let mockWalletAddress: string | null = WALLET_ADDRESS;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockWalletAddress,
}));
jest.mock('../ensureMusdAutoramp', () => ({ ensureMusdAutoramp: jest.fn() }));
jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));
jest.mock('./useVbaRegionSourceCurrency', () => ({
  useVbaRegionSourceCurrency: jest.fn(),
}));

const mockEnsureMusdAutoramp = jest.mocked(ensureMusdAutoramp);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockUseVbaRegionSourceCurrency = jest.mocked(useVbaRegionSourceCurrency);

describe('useStartVbaAccountSetupEarly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletAddress = WALLET_ADDRESS;
    mockEnsureMusdAutoramp.mockResolvedValue('ready');
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockUseVbaRegionSourceCurrency.mockReturnValue('BRL');
  });

  it('starts setup once with the region currency', () => {
    renderHook(() => useStartVbaAccountSetupEarly());

    expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
    expect(mockEnsureMusdAutoramp).toHaveBeenCalledWith(WALLET_ADDRESS, 'BRL');
  });

  it.each([
    [
      'there is no region currency (chooseCurrency on)',
      WALLET_ADDRESS,
      undefined,
      'WIFI',
    ],
    ['no wallet is selected', null, 'BRL', 'WIFI'],
    ['the network tier is NONE', WALLET_ADDRESS, 'BRL', 'NONE'],
  ] as const)(
    'does not start setup when %s',
    (_case, wallet, currency, networkTier) => {
      mockWalletAddress = wallet;
      mockUseVbaRegionSourceCurrency.mockReturnValue(currency);
      mockUseNetworkTier.mockReturnValue(networkTier);

      renderHook(() => useStartVbaAccountSetupEarly());

      expect(mockEnsureMusdAutoramp).not.toHaveBeenCalled();
    },
  );

  it('starts setup once the network comes back', () => {
    mockUseNetworkTier.mockReturnValue('NONE');
    const { rerender } = renderHook(() => useStartVbaAccountSetupEarly());
    mockUseNetworkTier.mockReturnValue('WIFI');

    rerender({});

    expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
  });

  it('does not rerun setup when the network tier changes', () => {
    const { rerender } = renderHook(() => useStartVbaAccountSetupEarly());
    mockUseNetworkTier.mockReturnValue('FAST_CELLULAR');

    rerender({});

    expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejected setup', async () => {
    mockEnsureMusdAutoramp.mockRejectedValue(new Error('setup failed'));

    renderHook(() => useStartVbaAccountSetupEarly());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
  });
});
