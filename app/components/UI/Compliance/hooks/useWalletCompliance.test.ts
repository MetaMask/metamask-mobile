import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  useWalletCompliance,
  useComplianceGate,
  useAccountGroupCompliance,
} from './useWalletCompliance';

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
});

describe('useAccountGroupCompliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks all addresses from the selected account group', () => {
    // useAccountGroupCompliance calls useSelector:
    // 1st: selectSelectedAccountGroupWithInternalAccountsAddresses
    // 2nd: selectComplianceEnabled
    // 3rd: selectIsWalletBlocked (single for [0])
    // 4th: selectAreAnyWalletsBlocked (batch)
    mockUseSelector
      .mockReturnValueOnce(['0xEVM', 'bc1qBTC', 'So1SOL']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked

    const { result } = renderHook(() => useAccountGroupCompliance());

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  it('returns isBlocked=false when account group has no addresses', () => {
    mockUseSelector
      .mockReturnValueOnce([]) // empty group
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    const { result } = renderHook(() => useAccountGroupCompliance());

    expect(result.current.isBlocked).toBe(false);
  });

  it('shows access restricted modal when any address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(['0xEVM', 'bc1qBTC']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked
      .mockReturnValueOnce(true); // selectAreAnyWalletsBlocked -> blocked

    renderHook(() => useAccountGroupCompliance());

    expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
  });

  it('does not show access restricted modal when no addresses are blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(['0xEVM', 'bc1qBTC']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked -> not blocked

    renderHook(() => useAccountGroupCompliance());

    expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
  });

  it('does not show access restricted modal when compliance is disabled even if address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce([BLOCKED_ADDRESS]) // group addresses
      .mockReturnValueOnce(false) // selectComplianceEnabled -> disabled
      .mockReturnValueOnce(true) // selectIsWalletBlocked -> blocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    renderHook(() => useAccountGroupCompliance());

    expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();
  });

  it('hides modal when blocked status changes from true to false on rerender', () => {
    // Initial render: blocked
    mockUseSelector
      .mockReturnValueOnce(['0xEVM']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true) // selectIsWalletBlocked -> blocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    const { rerender } = renderHook(() => useAccountGroupCompliance());

    expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);

    // Rerender: no longer blocked (e.g. switched to a non-blocked account group)
    mockUseSelector
      .mockReturnValueOnce(['0xSAFE']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked -> not blocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    rerender();

    expect(mockHideAccessRestrictedModal).toHaveBeenCalledTimes(1);
  });

  it('shows modal when blocked status changes from false to true on rerender', () => {
    // Initial render: not blocked
    mockUseSelector
      .mockReturnValueOnce(['0xEVM']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false) // selectIsWalletBlocked -> not blocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    const { rerender } = renderHook(() => useAccountGroupCompliance());

    expect(mockShowAccessRestrictedModal).not.toHaveBeenCalled();

    // Rerender: now blocked
    mockUseSelector
      .mockReturnValueOnce(['0xEVM']) // group addresses
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true) // selectIsWalletBlocked -> blocked
      .mockReturnValueOnce(false); // selectAreAnyWalletsBlocked

    rerender();

    expect(mockShowAccessRestrictedModal).toHaveBeenCalledTimes(1);
  });
});
