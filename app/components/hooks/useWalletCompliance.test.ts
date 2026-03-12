import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useWalletCompliance, useComplianceGate } from './useWalletCompliance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockCheckWalletCompliance = jest.fn();

jest.mock('../../core/Engine', () => ({
  context: {
    ComplianceController: {
      checkWalletCompliance: (...args: unknown[]) =>
        mockCheckWalletCompliance(...args),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const BLOCKED_ADDRESS = '0xBLOCKED';
const SAFE_ADDRESS = '0xSAFE';

describe('useWalletCompliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isBlocked=true for a blocked address', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useWalletCompliance(BLOCKED_ADDRESS));

    expect(result.current.isBlocked).toBe(true);
  });

  it('returns isBlocked=false for a safe address', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useWalletCompliance(SAFE_ADDRESS));

    expect(result.current.isBlocked).toBe(false);
  });

  it('provides a checkCompliance function that calls the controller', async () => {
    mockUseSelector.mockReturnValue(false);
    mockCheckWalletCompliance.mockResolvedValue({
      address: SAFE_ADDRESS,
      blocked: false,
      checkedAt: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useWalletCompliance(SAFE_ADDRESS));

    await result.current.checkCompliance();
    expect(mockCheckWalletCompliance).toHaveBeenCalledWith(SAFE_ADDRESS);
  });
});

describe('useComplianceGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isBlocked=false when compliance is disabled even if address is blocked', () => {
    // useComplianceGate calls useSelector twice:
    // 1st: selectComplianceEnabled -> false
    // 2nd: selectIsWalletBlocked (via useWalletCompliance) -> true
    mockUseSelector
      .mockReturnValueOnce(false) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectIsWalletBlocked

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(false);
    expect(result.current.isBlocked).toBe(false);
  });

  it('returns isBlocked=true when compliance is enabled and address is blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(true); // selectIsWalletBlocked

    const { result } = renderHook(() => useComplianceGate(BLOCKED_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(true);
  });

  it('returns isBlocked=false when compliance is enabled but address is not blocked', () => {
    mockUseSelector
      .mockReturnValueOnce(true) // selectComplianceEnabled
      .mockReturnValueOnce(false); // selectIsWalletBlocked

    const { result } = renderHook(() => useComplianceGate(SAFE_ADDRESS));

    expect(result.current.isComplianceEnabled).toBe(true);
    expect(result.current.isBlocked).toBe(false);
  });
});
