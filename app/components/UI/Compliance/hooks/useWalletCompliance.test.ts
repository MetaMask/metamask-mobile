import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useWalletCompliance, useComplianceGate } from './useWalletCompliance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockCheckWalletCompliance = jest.fn();
const mockCheckWalletsCompliance = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    ComplianceController: {
      checkWalletCompliance: (...args: unknown[]) =>
        mockCheckWalletCompliance(...args),
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
const SAFE_ADDRESS_2 = '0xSAFE2';

describe('useWalletCompliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isBlocked=true for a blocked single address', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useWalletCompliance(BLOCKED_ADDRESS));

    expect(result.current.isBlocked).toBe(true);
  });

  it('returns isBlocked=false for a safe single address', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useWalletCompliance(SAFE_ADDRESS));

    expect(result.current.isBlocked).toBe(false);
  });

  it('calls checkWalletCompliance for a single address', async () => {
    mockUseSelector.mockReturnValue(false);
    mockCheckWalletCompliance.mockResolvedValue({
      address: SAFE_ADDRESS,
      blocked: false,
      checkedAt: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useWalletCompliance(SAFE_ADDRESS));

    await result.current.checkCompliance();
    expect(mockCheckWalletCompliance).toHaveBeenCalledWith(SAFE_ADDRESS);
    expect(mockCheckWalletsCompliance).not.toHaveBeenCalled();
  });

  it('returns isBlocked=true when any address in an array is blocked', () => {
    // 1st call: selectIsWalletBlocked (single, for addresses[0]) -> false
    // 2nd call: selectAreAnyWalletsBlocked (batch) -> true
    mockUseSelector.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const { result } = renderHook(() =>
      useWalletCompliance([SAFE_ADDRESS, BLOCKED_ADDRESS]),
    );

    expect(result.current.isBlocked).toBe(true);
  });

  it('returns isBlocked=false when no address in an array is blocked', () => {
    mockUseSelector.mockReturnValueOnce(false).mockReturnValueOnce(false);

    const { result } = renderHook(() =>
      useWalletCompliance([SAFE_ADDRESS, SAFE_ADDRESS_2]),
    );

    expect(result.current.isBlocked).toBe(false);
  });

  it('calls checkWalletsCompliance for an array of addresses', async () => {
    mockUseSelector.mockReturnValue(false);
    mockCheckWalletsCompliance.mockResolvedValue([
      {
        address: SAFE_ADDRESS,
        blocked: false,
        checkedAt: '2025-01-01T00:00:00Z',
      },
      {
        address: SAFE_ADDRESS_2,
        blocked: false,
        checkedAt: '2025-01-01T00:00:00Z',
      },
    ]);

    const { result } = renderHook(() =>
      useWalletCompliance([SAFE_ADDRESS, SAFE_ADDRESS_2]),
    );

    await result.current.checkCompliance();
    expect(mockCheckWalletsCompliance).toHaveBeenCalledWith([
      SAFE_ADDRESS,
      SAFE_ADDRESS_2,
    ]);
    expect(mockCheckWalletCompliance).not.toHaveBeenCalled();
  });
});

describe('useComplianceGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for checkCompliance calls triggered by the prefetch effect.
    mockCheckWalletCompliance.mockResolvedValue({
      address: SAFE_ADDRESS,
      blocked: false,
      checkedAt: '2025-01-01T00:00:00Z',
    });
    mockCheckWalletsCompliance.mockResolvedValue([]);
  });

  it('returns isBlocked=false when compliance is disabled even if address is blocked', () => {
    // useComplianceGate calls useSelector:
    // 1st: selectComplianceEnabled -> false
    // 2nd: selectIsWalletBlocked -> true
    // 3rd: selectAreAnyWalletsBlocked -> false (empty array for single)
    mockUseSelector
      .mockReturnValueOnce(false) // selectComplianceEnabled
      .mockReturnValueOnce(true) // selectIsWalletBlocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked (empty)

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(false);
    expect(result.current.isBlocked).toBe(false);
  });

  it('returns isBlocked=true when compliance is enabled and address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true) // selectIsWalletBlocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked (empty)

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  it('works with array of addresses', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked (single for [0])
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked (batch)

    const { result } = renderHook(() =>
      useComplianceGate([SAFE_ADDRESS, BLOCKED_ADDRESS]),
    );

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  describe('prefetch effect', () => {
    it('calls checkCompliance on mount when compliance is enabled', async () => {
      mockUseSelector.mockReturnValue(true);

      renderHook(() => useComplianceGate(SAFE_ADDRESS));

      // Flush promises so the useEffect's checkCompliance() call resolves
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockCheckWalletCompliance).toHaveBeenCalledWith(SAFE_ADDRESS);
    });

    it('does not call checkCompliance on mount when compliance is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce(false) // selectComplianceEnabled
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      renderHook(() => useComplianceGate(SAFE_ADDRESS));

      expect(mockCheckWalletCompliance).not.toHaveBeenCalled();
    });

    it('handles checkCompliance errors silently without throwing', async () => {
      mockUseSelector.mockReturnValue(true);
      mockCheckWalletCompliance.mockRejectedValue(new Error('API error'));

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
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('executes action synchronously when compliance is enabled and cache says not blocked', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });

    it('blocks action and shows modal when cache says address is blocked (single address)', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(true) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      const action = jest.fn();
      const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).not.toHaveBeenCalled();
      expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
      expect(value).toBeUndefined();
    });

    it('blocks action and shows modal when cache says any address is blocked (multi-address)', async () => {
      mockUseSelector
        .mockReturnValueOnce(true) // selectComplianceEnabled
        .mockReturnValueOnce(false) // selectIsWalletBlocked (single for [0])
        .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

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
        .mockReturnValueOnce(false) // selectIsWalletBlocked
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
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      let resolvePrefetch!: () => void;
      const prefetchPromise = new Promise<void>(
        (resolve) => (resolvePrefetch = resolve),
      );
      mockCheckWalletCompliance.mockReturnValue(prefetchPromise);

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
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      // prefetch resolves immediately
      mockCheckWalletCompliance.mockResolvedValue({
        address: SAFE_ADDRESS,
        blocked: false,
        checkedAt: '2025-01-01T00:00:00Z',
      });

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
        .mockReturnValueOnce(false) // selectIsWalletBlocked
        .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

      mockCheckWalletCompliance.mockRejectedValue(new Error('Network error'));

      const action = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

      const value = await result.current.gate(action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
      expect(value).toBe('result');
    });
  });
});
