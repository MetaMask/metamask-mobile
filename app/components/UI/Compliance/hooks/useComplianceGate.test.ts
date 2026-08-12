import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { useComplianceGate } from './useComplianceGate';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockCheckWalletsCompliance = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    ComplianceController: {
      checkWalletsCompliance: (...args: unknown[]) =>
        mockCheckWalletsCompliance(...args),
    },
  },
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupWithInternalAccountsAddresses: jest.fn(),
  }),
);

const mockShowAccessRestrictedModal = jest.fn();
const mockHideAccessRestrictedModal = jest.fn();

jest.mock('../contexts/AccessRestrictedContext', () => ({
  useAccessRestrictedModal: () => ({
    showAccessRestrictedModal: mockShowAccessRestrictedModal,
    hideAccessRestrictedModal: mockHideAccessRestrictedModal,
    isAccessRestricted: false,
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const BLOCKED_ADDRESS = '0xBLOCKED';
const SAFE_ADDRESS = '0xSAFE';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useComplianceGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: API returns no blocked wallets — drives the compliance check
    // result read inside gate().
    mockCheckWalletsCompliance.mockResolvedValue([]);
  });

  it('returns isBlocked=false when compliance is disabled even if address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(false) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS), {
      wrapper: Wrapper,
    });

    expect(result.current.isComplianceEnabled).toBe(false);
    expect(result.current.isBlocked).toBe(false);
  });

  it('returns isBlocked=true when compliance is enabled and address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS), {
      wrapper: Wrapper,
    });

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  it('works with array of addresses', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useComplianceGate([SAFE_ADDRESS, BLOCKED_ADDRESS]),
      { wrapper: Wrapper },
    );

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  describe('no address provided', () => {
    it('returns isBlocked=false when no address is provided', () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(), {
        wrapper: Wrapper,
      });

      expect(result.current.isBlocked).toBe(false);
      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });

    it('gate() proceeds with action when no address is provided', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(value).toBe('result');
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });
  });

  describe('prefetch effect', () => {
    it('calls checkCompliance on mount when compliance is enabled', async () => {
      mockUseSelector.mockReturnValue(true);

      const { Wrapper } = createWrapper();
      renderHook(() => useComplianceGate(SAFE_ADDRESS), { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockCheckWalletsCompliance).toHaveBeenCalledWith([SAFE_ADDRESS]);
      });
    });

    it('does not call checkCompliance on mount when compliance is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce(false) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const { Wrapper } = createWrapper();
      renderHook(() => useComplianceGate(SAFE_ADDRESS), { wrapper: Wrapper });

      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });

    it('handles checkCompliance errors silently without throwing', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockRejectedValue(new Error('API error'));

      const { Wrapper } = createWrapper();
      renderHook(() => useComplianceGate(SAFE_ADDRESS), { wrapper: Wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      // No assertions needed beyond "did not throw"
      expect(true).toBe(true);
    });
  });

  describe('freshness cache', () => {
    it('skips the network call on a second mount for the same address within the freshness window', async () => {
      mockUseSelector.mockReturnValue(true);
      const { Wrapper } = createWrapper();

      const { unmount } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
      });
      unmount();

      // Second screen mounts for the SAME address, same QueryClient (as it
      // would be across screens in the real app, sharing the global client).
      renderHook(() => useComplianceGate(SAFE_ADDRESS), { wrapper: Wrapper });

      // Give any effect a chance to run, then confirm no second fetch fired.
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
    });

    it('does not call checkCompliance again for a different address within the freshness window once both are cached', async () => {
      mockUseSelector.mockReturnValue(true);
      const { Wrapper } = createWrapper();

      const { unmount } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });
      await waitFor(() => {
        expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
      });
      unmount();

      const { unmount: unmount2 } = renderHook(
        () => useComplianceGate(BLOCKED_ADDRESS),
        { wrapper: Wrapper },
      );
      await waitFor(() => {
        expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(2);
      });
      unmount2();

      // Re-open SAFE_ADDRESS — should be served from cache, not refetched.
      renderHook(() => useComplianceGate(SAFE_ADDRESS), { wrapper: Wrapper });
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(2);
    });

    it('shares a single cache entry for the same wallet across differently-cased address strings', async () => {
      // Matches how the underlying package treats hex addresses as
      // case-insensitive (checksum casing carries no meaning) — a mixed-case
      // reference to the same wallet should reuse the cached result rather
      // than triggering its own network call.
      mockUseSelector.mockReturnValue(true);
      const checksummedAddress = '0xAbCdEf0123456789aBcDef0123456789ABCDEF01';
      const lowercaseAddress = checksummedAddress.toLowerCase();
      const { Wrapper } = createWrapper();

      const { unmount } = renderHook(
        () => useComplianceGate(checksummedAddress),
        { wrapper: Wrapper },
      );
      await waitFor(() => {
        expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
      });
      unmount();

      renderHook(() => useComplianceGate(lowercaseAddress), {
        wrapper: Wrapper,
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Same wallet, different casing — should be served from the same
      // cache entry, not refetched.
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
    });

    it('dedupes a gate() call that fires while the mount-time prefetch is still in flight', async () => {
      mockUseSelector.mockReturnValue(true);

      let resolvePrefetch!: (
        value: { address: string; blocked: boolean; checkedAt: string }[],
      ) => void;
      const prefetchPromise = new Promise<
        { address: string; blocked: boolean; checkedAt: string }[]
      >((resolve) => {
        resolvePrefetch = resolve;
      });
      mockCheckWalletsCompliance.mockReturnValue(prefetchPromise);

      const action = jest.fn().mockResolvedValue('result');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      const gatePromise = result.current.gate(action);

      // Action must not have run yet while the shared fetch is pending.
      expect(action).not.toHaveBeenCalled();
      // Only one network call in flight, shared by the prefetch and gate().
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);

      resolvePrefetch([]);
      await gatePromise;

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
    });
  });

  describe('gate()', () => {
    it('executes action directly when compliance is disabled', async () => {
      mockUseSelector
        .mockReturnValueOnce(false) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('executes action when compliance is enabled and the check says not blocked', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockResolvedValue([
        {
          address: SAFE_ADDRESS,
          blocked: false,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      ]);

      const action = jest.fn().mockResolvedValue('action-result');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(value).toBe('action-result');
    });

    it('blocks action and shows modal when the check says address is blocked', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockResolvedValue([
        {
          address: BLOCKED_ADDRESS,
          blocked: true,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      ]);

      const action = jest.fn();
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      expect(action).not.toHaveBeenCalled();
      expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      expect(value).toBeUndefined();
    });

    it('blocks action and shows modal when any address in an array is blocked', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockResolvedValue([
        {
          address: SAFE_ADDRESS,
          blocked: false,
          checkedAt: '2025-01-01T00:00:00Z',
        },
        {
          address: BLOCKED_ADDRESS,
          blocked: true,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      ]);

      const action = jest.fn();
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useComplianceGate([SAFE_ADDRESS, BLOCKED_ADDRESS]),
        { wrapper: Wrapper },
      );

      const value = await result.current.gate(action);

      expect(action).not.toHaveBeenCalled();
      expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      expect(value).toBeUndefined();
    });

    it('proceeds with action when the check fails (fail-open on error)', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockRejectedValue(new Error('Network error'));

      const action = jest.fn().mockResolvedValue('result');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('fails open after a single attempt, without retrying (uses its own retry:false, not the app-wide retry:2 default)', async () => {
      // Uses a QueryClient with the app's real default options (retry: 2,
      // 1s/2s backoff) instead of createWrapper()'s retry:false override, to
      // prove the hook disables retry itself rather than relying on the test
      // wrapper to do it.
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: 2 } },
      });
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children,
        );

      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockRejectedValue(new Error('Network error'));

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS), {
        wrapper: Wrapper,
      });

      const value = await result.current.gate(action);

      // A single failed attempt is enough to fail open — no backoff delay.
      expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledTimes(1);
      expect(value).toBe('result');
    });

    describe('wallet switch race conditions', () => {
      it('abandons silently when the wallet switches while gate is awaiting a check', async () => {
        mockUseSelector.mockReturnValue(true);

        let resolveGateCheck!: (
          value: { address: string; blocked: boolean; checkedAt: string }[],
        ) => void;
        const gateCheckPromise = new Promise<
          { address: string; blocked: boolean; checkedAt: string }[]
        >((resolve) => {
          resolveGateCheck = resolve;
        });

        mockCheckWalletsCompliance
          .mockReturnValueOnce(gateCheckPromise) // BLOCKED_ADDRESS (in-flight)
          .mockResolvedValueOnce([]); // SAFE_ADDRESS after switch

        const action = jest.fn();
        const { Wrapper } = createWrapper();
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: BLOCKED_ADDRESS }, wrapper: Wrapper },
        );

        // Start gate while the prefetch/check is still in-flight.
        const gatePromise = result.current.gate(action);

        // Wallet switches mid-flight — currentAddressKeyRef updates immediately.
        rerender({ address: SAFE_ADDRESS });

        // Resolve the old check (not blocked — to confirm it's the address
        // check, not the blocked status, that causes the abandon).
        resolveGateCheck([
          {
            address: BLOCKED_ADDRESS,
            blocked: false,
            checkedAt: '2025-01-01T00:00:00Z',
          },
        ]);

        await act(async () => {
          await gatePromise;
        });

        // Action abandoned — it belonged to the previous wallet.
        expect(action).not.toHaveBeenCalled();
        expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      });

      it('blocks action for new address when its own check returns blocked, unaffected by the previous address', async () => {
        mockUseSelector.mockReturnValue(true);

        mockCheckWalletsCompliance
          .mockResolvedValueOnce([
            {
              address: SAFE_ADDRESS,
              blocked: false,
              checkedAt: '2025-01-01T00:00:00Z',
            },
          ])
          .mockResolvedValueOnce([
            {
              address: BLOCKED_ADDRESS,
              blocked: true,
              checkedAt: '2025-01-01T00:00:00Z',
            },
          ]);

        const action = jest.fn();
        const { Wrapper } = createWrapper();
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: SAFE_ADDRESS }, wrapper: Wrapper },
        );

        await waitFor(() => {
          expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(1);
        });

        rerender({ address: BLOCKED_ADDRESS });

        await waitFor(() => {
          expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(2);
        });

        await act(async () => {
          await result.current.gate(action);
        });

        expect(action).not.toHaveBeenCalled();
        expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      });

      it('does not let a stale in-flight fetch for a previous address affect a different, unrelated address', async () => {
        // Different addresses use different query cache keys, so there is no
        // shared mutable "latest result" slot for a stale response to clobber
        // — the old address' fetch, however late it resolves, can only ever
        // populate its own cache entry.
        mockUseSelector.mockReturnValue(true);

        let resolveOldFetch!: (
          value: { address: string; blocked: boolean; checkedAt: string }[],
        ) => void;
        const oldFetch = new Promise<
          { address: string; blocked: boolean; checkedAt: string }[]
        >((resolve) => {
          resolveOldFetch = resolve;
        });
        mockCheckWalletsCompliance
          .mockReturnValueOnce(oldFetch) // BLOCKED_ADDRESS
          .mockResolvedValueOnce([]); // SAFE_ADDRESS

        const action = jest.fn().mockResolvedValue('result');
        const { Wrapper } = createWrapper();
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: BLOCKED_ADDRESS }, wrapper: Wrapper },
        );

        rerender({ address: SAFE_ADDRESS });

        await waitFor(() => {
          expect(mockCheckWalletsCompliance).toHaveBeenCalledTimes(2);
        });

        // Old fetch resolves late with blocked=true for BLOCKED_ADDRESS —
        // must not affect a gate() call for SAFE_ADDRESS.
        resolveOldFetch([
          {
            address: BLOCKED_ADDRESS,
            blocked: true,
            checkedAt: '2025-01-01T00:00:00Z',
          },
        ]);
        await act(async () => {
          await Promise.resolve();
        });

        const value = await result.current.gate(action);

        expect(action).toHaveBeenCalledTimes(1);
        expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
        expect(value).toBe('result');
      });
    });
  });
});
