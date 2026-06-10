import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useComplianceGate } from './useComplianceGate';

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

describe('useComplianceGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: API returns no blocked wallets — drives prefetchBlockedRef inside gate().
    mockCheckWalletsCompliance.mockResolvedValue([]);
  });

  it('returns isBlocked=false when compliance is disabled even if address is blocked', () => {
    // useComplianceGate calls useSelector:
    // 1st: selectComplianceEnabled -> false
    // 2nd: selectAreAnyWalletsBlocked -> true
    mockUseSelector
      .mockReturnValueOnce(false) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(false);
    expect(result.current.isBlocked).toBe(false);
  });

  it('returns isBlocked=true when compliance is enabled and address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  it('works with array of addresses', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { result } = renderHook(() =>
      useComplianceGate([SAFE_ADDRESS, BLOCKED_ADDRESS]),
    );

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  describe('no address provided', () => {
    it('returns isBlocked=false when no address is provided', () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const { result } = renderHook(() => useComplianceGate());

      expect(result.current.isBlocked).toBe(false);
      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });

    it('gate() proceeds with action when no address is provided', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate());

      // Let the prefetch settle — checkCompliance returns undefined for empty addressKey
      await act(async () => {
        await Promise.resolve();
      });

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(value).toBe('result');
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      // checkWalletsCompliance is never called when there is no address to check
      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });
  });

  describe('prefetch effect', () => {
    it('calls checkCompliance on mount when compliance is enabled', async () => {
      mockUseSelector.mockReturnValue(true);

      renderHook(() => useComplianceGate(SAFE_ADDRESS));

      // Flush promises so the useEffect's checkCompliance() call resolves
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockCheckWalletsCompliance).toHaveBeenCalledWith([SAFE_ADDRESS]);
    });

    it('does not call checkCompliance on mount when compliance is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce(false) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      renderHook(() => useComplianceGate(SAFE_ADDRESS));

      expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
    });

    it('handles checkCompliance errors silently without throwing', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletsCompliance.mockRejectedValue(new Error('API error'));

      renderHook(() => useComplianceGate(SAFE_ADDRESS));

      // Flush promises — should not throw, errors are swallowed in the prefetch catch
      await act(async () => {
        await Promise.resolve();
      });

      // No assertions needed beyond "did not throw"
      expect(true).toBe(true);
    });
  });

  describe('gate()', () => {
    it('executes action directly when compliance is disabled', async () => {
      mockUseSelector
        .mockReturnValueOnce(false) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('executes action when compliance is enabled and cache says not blocked', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('blocks action and shows modal when cache says address is blocked', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked (render)
      // API returns blocked — drives prefetchBlockedRef inside gate().
      mockCheckWalletsCompliance.mockResolvedValue([
        {
          address: BLOCKED_ADDRESS,
          blocked: true,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      ]);

      const action = jest.fn();
      const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).not.toHaveBeenCalled();
      expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      expect(value).toBeUndefined();
    });

    it('blocks action and shows modal when any address in an array is blocked', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked (render)
      // API returns one blocked address — drives prefetchBlockedRef inside gate().
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
      const { result } = renderHook(() =>
        useComplianceGate([SAFE_ADDRESS, BLOCKED_ADDRESS]),
      );

      const value = await result.current.gate(action);

      expect(action).not.toHaveBeenCalled();
      expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      expect(value).toBeUndefined();
    });

    it('executes action and returns its result when cache says not blocked', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('action-result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(value).toBe('action-result');
    });

    it('waits for in-flight prefetch before reading isBlocked (race condition guard)', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      let resolvePrefetch!: () => void;
      const prefetchPromise = new Promise<void>(
        (resolve) => (resolvePrefetch = resolve),
      );
      mockCheckWalletsCompliance.mockReturnValue(prefetchPromise);

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      // Start gate — it should wait for the in-flight prefetch
      const gatePromise = result.current.gate(action);

      // Action must not have run yet while prefetch is pending
      expect(action).not.toHaveBeenCalled();

      // Resolve the prefetch and flush promises
      resolvePrefetch();
      await gatePromise;

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('resolves instantly when prefetch is already complete before gate is called', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      mockCheckWalletsCompliance.mockResolvedValue([
        {
          address: SAFE_ADDRESS,
          blocked: false,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      ]);

      const action = jest.fn().mockResolvedValue('fast');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      // Flush promises so the prefetch effect settles before gate is called
      await act(async () => {
        await Promise.resolve();
      });

      const value = await result.current.gate(action);

      expect(value).toBe('fast');
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('proceeds with action when prefetch fails (fail-open on error)', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      mockCheckWalletsCompliance.mockRejectedValue(new Error('Network error'));

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    describe('wallet switch race conditions', () => {
      it('does not apply a late-resolving stale prefetch to the new address', async () => {
        // Scenario: prefetch for BLOCKED_ADDRESS is still in-flight when the
        // wallet switches to SAFE_ADDRESS. The old prefetch resolves blocked=true
        // AFTER the new address is active. The requestId guard must prevent it
        // from writing prefetchBlockedRef, so gate() for SAFE_ADDRESS allows
        // the action.
        mockUseSelector.mockReturnValue(true); // compliance enabled for all renders

        let resolveOldPrefetch!: (
          value: { address: string; blocked: boolean; checkedAt: string }[],
        ) => void;
        const oldPrefetch = new Promise<
          { address: string; blocked: boolean; checkedAt: string }[]
        >((resolve) => {
          resolveOldPrefetch = resolve;
        });

        mockCheckWalletsCompliance
          .mockReturnValueOnce(oldPrefetch) // first call: BLOCKED_ADDRESS (in-flight)
          .mockResolvedValueOnce([
            {
              address: SAFE_ADDRESS,
              blocked: false,
              checkedAt: '2025-01-01T00:00:00Z',
            },
          ]); // second call: SAFE_ADDRESS

        const action = jest.fn().mockResolvedValue('result');
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: BLOCKED_ADDRESS } },
        );

        // Switch to SAFE_ADDRESS — new prefetch starts, requestId incremented.
        rerender({ address: SAFE_ADDRESS });

        // Let the new prefetch for SAFE_ADDRESS settle (not blocked).
        await act(async () => {
          await Promise.resolve();
        });

        // Now resolve the old prefetch with blocked=true. The requestId guard
        // must prevent this from writing prefetchBlockedRef.
        resolveOldPrefetch([
          {
            address: BLOCKED_ADDRESS,
            blocked: true,
            checkedAt: '2025-01-01T00:00:00Z',
          },
        ]);
        await act(async () => {
          await Promise.resolve();
        });

        const value = await act(async () => result.current.gate(action));

        expect(action).toHaveBeenCalledTimes(1);
        expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
        expect(value).toBe('result');
      });

      it('abandons silently when the wallet switches while gate is awaiting a check', async () => {
        // Scenario: gate() is called with BLOCKED_ADDRESS while the prefetch is
        // in-flight. Before it resolves, the wallet switches to SAFE_ADDRESS.
        // gate() must not run the action and must not show the modal.
        mockUseSelector.mockReturnValue(true);

        let resolveGatePrefetch!: (
          value: { address: string; blocked: boolean; checkedAt: string }[],
        ) => void;
        const gatePrefetch = new Promise<
          { address: string; blocked: boolean; checkedAt: string }[]
        >((resolve) => {
          resolveGatePrefetch = resolve;
        });

        mockCheckWalletsCompliance
          .mockReturnValueOnce(gatePrefetch) // prefetch for BLOCKED_ADDRESS
          .mockResolvedValueOnce([]); // prefetch for SAFE_ADDRESS after switch

        const action = jest.fn();
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: BLOCKED_ADDRESS } },
        );

        // Start gate while the prefetch is still in-flight.
        const gatePromise = result.current.gate(action);

        // Wallet switches mid-flight — currentAddressKeyRef updates immediately.
        rerender({ address: SAFE_ADDRESS });

        // Resolve the old prefetch (not blocked — to confirm it's the address
        // check, not the blocked status, that causes the abandon).
        resolveGatePrefetch([
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

      it('blocks action for new address when its own prefetch returns blocked', async () => {
        // Sanity check: after a wallet switch, gate() correctly blocks when the
        // NEW address is blocked (not a false positive from the old address).
        mockUseSelector.mockReturnValue(true);

        mockCheckWalletsCompliance
          .mockResolvedValueOnce([
            {
              address: SAFE_ADDRESS,
              blocked: false,
              checkedAt: '2025-01-01T00:00:00Z',
            },
          ]) // prefetch for SAFE_ADDRESS
          .mockResolvedValueOnce([
            {
              address: BLOCKED_ADDRESS,
              blocked: true,
              checkedAt: '2025-01-01T00:00:00Z',
            },
          ]); // prefetch for BLOCKED_ADDRESS

        const action = jest.fn();
        const { result, rerender } = renderHook(
          ({ address }: { address: string }) => useComplianceGate(address),
          { initialProps: { address: SAFE_ADDRESS } },
        );

        // Let SAFE_ADDRESS prefetch settle.
        await act(async () => {
          await Promise.resolve();
        });

        // Switch to BLOCKED_ADDRESS.
        rerender({ address: BLOCKED_ADDRESS });

        // Let BLOCKED_ADDRESS prefetch settle.
        await act(async () => {
          await Promise.resolve();
        });

        await act(async () => {
          await result.current.gate(action);
        });

        expect(action).not.toHaveBeenCalled();
        expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      });
    });
  });
});
