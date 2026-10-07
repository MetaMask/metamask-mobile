import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePerpsAccountSupport } from './usePerpsAccountSupport';

const mockGetAccountSupport = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: () => '0xabc',
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => 'mainnet',
  selectPerpsProvider: () => 'hyperliquid',
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getAccountSupport: () => mockGetAccountSupport(),
    },
  },
}));

describe('usePerpsAccountSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccountSupport.mockResolvedValue({ isSupported: true });
  });

  it('prefetches account support without opening the modal', async () => {
    const { result } = renderHook(() => usePerpsAccountSupport());

    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalledTimes(1));

    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });

  it('blocks an action and opens the modal for a multi-signature account', async () => {
    mockGetAccountSupport.mockResolvedValue({
      isSupported: false,
      reason: 'multi_sig_account',
    });
    const { result } = renderHook(() => usePerpsAccountSupport());

    let isSupported = true;
    await act(async () => {
      isSupported = await result.current.checkAccountSupport();
    });

    expect(isSupported).toBe(false);
    expect(result.current.isAccountUnsupportedModalVisible).toBe(true);
  });

  it('fails open when the support query fails', async () => {
    mockGetAccountSupport.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => usePerpsAccountSupport());

    let isSupported = false;
    await act(async () => {
      isSupported = await result.current.checkAccountSupport();
    });

    expect(isSupported).toBe(true);
    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });
});
