import React from 'react';
import { Provider } from 'react-redux';
import { configureStore, createAction, createReducer } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  GetAccountSupportParams,
  PerpsAccountSupport,
  PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsAccountSupport } from './usePerpsAccountSupport';

const mockGetAccountSupport = jest.fn();
const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getAccountSupport: (params?: GetAccountSupportParams) =>
        mockGetAccountSupport(params),
    },
  },
}));

interface SupportContext {
  address: string;
  provider: PerpsProviderType;
  isTestnet: boolean;
}

const DEFAULT_CONTEXT: SupportContext = {
  address: '0xabc',
  provider: 'hyperliquid',
  isTestnet: false,
};

const buildState = ({ address, provider, isTestnet }: SupportContext) => ({
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account-1',
          accounts: { 'account-1': { id: 'account-1', address } },
        },
      },
      PerpsController: { activeProvider: provider, isTestnet },
    },
  },
});

const setContext = createAction<Partial<SupportContext>>('test/setContext');

const renderAccountSupport = () => {
  let context = DEFAULT_CONTEXT;
  const store = configureStore({
    reducer: createReducer(buildState(context), (builder) => {
      builder.addCase(setContext, (_state, action) => {
        context = { ...context, ...action.payload };
        return buildState(context);
      });
    }),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => usePerpsAccountSupport(), { wrapper });

  return {
    ...hook,
    changeContext: (change: Partial<SupportContext>) =>
      act(() => {
        store.dispatch(setContext(change));
      }),
  };
};

const holdNextSupportRead = () => {
  let resolveSupport: (support: PerpsAccountSupport) => void = () => undefined;
  mockGetAccountSupport.mockReturnValueOnce(
    new Promise<PerpsAccountSupport>((resolve) => {
      resolveSupport = resolve;
    }),
  );
  return (support: PerpsAccountSupport) => resolveSupport(support);
};

describe('usePerpsAccountSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccountSupport.mockResolvedValue({ isSupported: true });
  });

  it('prefetches account support without opening the modal', async () => {
    const { result } = renderAccountSupport();

    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalledTimes(1));

    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });

  it('blocks an action and opens the modal for a multi-signature account', async () => {
    mockGetAccountSupport.mockResolvedValue({
      isSupported: false,
      reason: 'multi_sig_account',
    });
    const { result } = renderAccountSupport();

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

  it.each([
    { name: 'account', change: { address: '0xdef' } },
    { name: 'network', change: { isTestnet: true } },
    { name: 'provider', change: { provider: 'lighter' as const } },
  ])(
    'hides the explanation when the $name changes while the next read is pending',
    async ({ change }) => {
      mockGetAccountSupport.mockResolvedValue({
        isSupported: false,
        reason: 'multi_sig_account',
      });
      const hook = renderAccountSupport();
      await act(async () => {
        await hook.result.current.checkAccountSupport();
      });
      expect(hook.result.current.isAccountUnsupportedModalVisible).toBe(true);
      holdNextSupportRead();

      hook.changeContext(change);

      expect(hook.result.current.isAccountUnsupportedModalVisible).toBe(false);
    },
  );

  it('checks the requested execution provider instead of the default provider', async () => {
    mockGetAccountSupport.mockImplementation(
      async (params?: GetAccountSupportParams): Promise<PerpsAccountSupport> =>
        params?.providerId === 'lighter'
          ? { isSupported: true }
          : { isSupported: false, reason: 'multi_sig_account' },
    );
    const { result } = renderAccountSupport();

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
    { name: 'account', change: { address: '0xdef' } },
    { name: 'network', change: { isTestnet: true } },
    {
      name: 'default provider route',
      change: { provider: 'lighter' as const },
    },
  ])(
    'returns stale when the $name changes during a default-route check',
    async ({ change }) => {
      const hook = renderAccountSupport();
      await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
      const resolveSupport = holdNextSupportRead();

      let checkPromise: Promise<string> = Promise.resolve('supported');
      act(() => {
        checkPromise = hook.result.current.checkAccountSupport();
      });
      hook.changeContext(change);
      let support = 'supported';
      await act(async () => {
        resolveSupport({ isSupported: true });
        support = await checkPromise;
      });

      expect(support).toBe('stale');
      expect(hook.result.current.isAccountUnsupportedModalVisible).toBe(false);
    },
  );

  it('keeps an explicit execution route current when only the default provider changes', async () => {
    const hook = renderAccountSupport();
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    const resolveSupport = holdNextSupportRead();

    let checkPromise: Promise<string> = Promise.resolve('stale');
    act(() => {
      checkPromise = hook.result.current.checkAccountSupport('lighter');
    });
    hook.changeContext({ provider: 'lighter' });
    let support = 'stale';
    await act(async () => {
      resolveSupport({ isSupported: true });
      support = await checkPromise;
    });

    expect(support).toBe('supported');
  });

  it('returns unmounted when the caller unmounts during a supported check', async () => {
    const hook = renderAccountSupport();
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    const resolveSupport = holdNextSupportRead();

    let checkPromise: Promise<string> = Promise.resolve('supported');
    act(() => {
      checkPromise = hook.result.current.checkAccountSupport();
    });
    hook.unmount();
    let support = 'supported';
    await act(async () => {
      resolveSupport({ isSupported: true });
      support = await checkPromise;
    });

    expect(support).toBe('unmounted');
  });

  it('returns unsupported when the caller unmounts during an unsupported check', async () => {
    const hook = renderAccountSupport();
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    const resolveSupport = holdNextSupportRead();

    let checkPromise: Promise<string> = Promise.resolve('supported');
    act(() => {
      checkPromise = hook.result.current.checkAccountSupport();
    });
    hook.unmount();
    let support = 'supported';
    await act(async () => {
      resolveSupport({ isSupported: false, reason: 'multi_sig_account' });
      support = await checkPromise;
    });

    expect(support).toBe('unsupported');
    expect(hook.result.current.isAccountUnsupportedModalVisible).toBe(false);
  });

  it('returns stale when the account changes before the caller unmounts', async () => {
    const hook = renderAccountSupport();
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    const resolveSupport = holdNextSupportRead();

    let checkPromise: Promise<string> = Promise.resolve('supported');
    act(() => {
      checkPromise = hook.result.current.checkAccountSupport();
    });
    hook.changeContext({ address: '0xdef' });
    hook.unmount();
    let support = 'supported';
    await act(async () => {
      resolveSupport({ isSupported: true });
      support = await checkPromise;
    });

    expect(support).toBe('stale');
  });

  it('returns stale when the account changes after the caller unmounts', async () => {
    const hook = renderAccountSupport();
    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());
    const resolveSupport = holdNextSupportRead();

    let checkPromise: Promise<string> = Promise.resolve('supported');
    act(() => {
      checkPromise = hook.result.current.checkAccountSupport();
    });
    hook.unmount();
    hook.changeContext({ address: '0xdef' });
    let support = 'supported';
    await act(async () => {
      resolveSupport({ isSupported: true });
      support = await checkPromise;
    });

    expect(support).toBe('stale');
  });

  it('does not trace the background prefetch', async () => {
    renderAccountSupport();

    await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalledTimes(1));

    expect(mockTrace).not.toHaveBeenCalled();
  });

  it.each([
    {
      outcome: 'unsupported',
      read: () =>
        mockGetAccountSupport.mockResolvedValue({
          isSupported: false,
          reason: 'multi_sig_account',
        }),
    },
    {
      outcome: 'supported',
      read: () =>
        mockGetAccountSupport.mockRejectedValue(new Error('Unavailable')),
    },
  ])(
    'measures an action-time check that ends $outcome in a named trace',
    async ({ outcome, read }) => {
      read();
      const { result } = renderAccountSupport();
      await waitFor(() => expect(mockGetAccountSupport).toHaveBeenCalled());

      await act(async () => {
        await result.current.checkAccountSupport('lighter');
      });

      expect(mockTrace).toHaveBeenCalledTimes(1);
      const [traceRequest] = mockTrace.mock.calls[0];
      expect(traceRequest).toEqual(
        expect.objectContaining({
          name: 'Perps Account Support Check',
          op: 'perps.operation',
          tags: { provider: 'lighter' },
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: 'Perps Account Support Check',
        id: traceRequest.id,
        data: { result: outcome },
      });
    },
  );

  it('fails open when the support query fails', async () => {
    mockGetAccountSupport.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderAccountSupport();

    let support = 'stale';
    await act(async () => {
      support = await result.current.checkAccountSupport();
    });

    expect(support).toBe('supported');
    expect(result.current.isAccountUnsupportedModalVisible).toBe(false);
  });
});
