import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  GetAccountSupportParams,
  PerpsAccountSupport,
  PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsAccountSupport } from './usePerpsAccountSupport';

const mockGetAccountSupport = jest.fn();
let mockSelectedAddress: string | undefined = '0xabc';
let mockNetwork = 'mainnet';
let mockProvider: PerpsProviderType | undefined = 'hyperliquid';

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: () => mockSelectedAddress,
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => mockNetwork,
  selectPerpsProvider: () => mockProvider,
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getAccountSupport: (params?: GetAccountSupportParams) =>
        mockGetAccountSupport(params),
    },
  },
}));

describe('usePerpsAccountSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAddress = '0xabc';
    mockNetwork = 'mainnet';
    mockProvider = 'hyperliquid';
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

    let support = 'supported';
    await act(async () => {
      support = await result.current.checkAccountSupport('hyperliquid');
    });

    expect(support).toBe('unsupported');
    expect(mockGetAccountSupport).toHaveBeenLastCalledWith({
      providerId: 'hyperliquid',
    });
    expect(result.current.isAccountUnsupportedModalVisible).toBe(true);
  });

  it('checks the requested execution provider instead of the default provider', async () => {
    mockGetAccountSupport.mockImplementation(
      async (params?: GetAccountSupportParams): Promise<PerpsAccountSupport> =>
        params?.providerId === 'lighter'
          ? { isSupported: true }
          : { isSupported: false, reason: 'multi_sig_account' },
    );
    const { result } = renderHook(() => usePerpsAccountSupport());

    let support = 'stale';
    await act(async () => {
      support = await result.current.checkAccountSupport('lighter');
    });

    expect(support).toBe('supported');
    expect(mockGetAccountSupport).toHaveBeenLastCalledWith({
      providerId: 'lighter',
    });
    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });

  it.each([
    {
      name: 'account',
      changeContext: () => {
        mockSelectedAddress = '0xdef';
      },
    },
    {
      name: 'network',
      changeContext: () => {
        mockNetwork = 'testnet';
      },
    },
    {
      name: 'default provider route',
      changeContext: () => {
        mockProvider = 'lighter';
      },
    },
  ])(
    'returns stale when the $name changes during a default-route check',
    async ({ changeContext }) => {
      const hook = renderHook(() => usePerpsAccountSupport());
      await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
      let resolveSupport: ((support: PerpsAccountSupport) => void) | undefined;
      mockGetAccountSupport.mockReturnValueOnce(
        new Promise<PerpsAccountSupport>((resolve) => {
          resolveSupport = resolve;
        }),
      );
      let support = 'supported';

      let checkPromise: Promise<unknown> | undefined;
      act(() => {
        checkPromise = hook.result.current
          .checkAccountSupport()
          .then((result) => {
            support = result;
          });
      });
      changeContext();
      hook.rerender({});
      await act(async () => {
        resolveSupport?.({ isSupported: true });
        await checkPromise;
      });

      expect(support).toBe('stale');
      expect(hook.result.current.isAccountUnsupportedModalVisible).toBe(false);
    },
  );

  it('keeps an explicit execution route current when only the default provider changes', async () => {
    const hook = renderHook(() => usePerpsAccountSupport());
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    let resolveSupport: ((support: PerpsAccountSupport) => void) | undefined;
    mockGetAccountSupport.mockReturnValueOnce(
      new Promise<PerpsAccountSupport>((resolve) => {
        resolveSupport = resolve;
      }),
    );
    let support = 'stale';

    let checkPromise: Promise<unknown> | undefined;
    act(() => {
      checkPromise = hook.result.current
        .checkAccountSupport('lighter')
        .then((result) => {
          support = result;
        });
    });
    mockProvider = 'lighter';
    hook.rerender({});
    await act(async () => {
      resolveSupport?.({ isSupported: true });
      await checkPromise;
    });

    expect(support).toBe('supported');
  });

  it('fails open when the support query fails', async () => {
    mockGetAccountSupport.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => usePerpsAccountSupport());

    let support = 'stale';
    await act(async () => {
      support = await result.current.checkAccountSupport();
    });

    expect(support).toBe('supported');
    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });
});
