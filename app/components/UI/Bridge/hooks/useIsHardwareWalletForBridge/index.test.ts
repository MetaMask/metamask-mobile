import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useIsHardwareWalletForBridge } from './index';
import { isHardwareAccount } from '../../../../../util/address';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsHardwareAccount = isHardwareAccount as jest.MockedFunction<
  typeof isHardwareAccount
>;

describe('useIsHardwareWalletForBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(undefined);
    mockIsHardwareAccount.mockReturnValue(false);
  });

  it('returns false when source wallet address is undefined', () => {
    mockUseSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsHardwareWalletForBridge());

    expect(result.current).toBe(false);
    expect(mockIsHardwareAccount).not.toHaveBeenCalled();
  });

  it('returns true when source wallet is a hardware account', () => {
    const address = '0x1234567890123456789012345678901234567890';
    mockUseSelector.mockReturnValue(address);
    mockIsHardwareAccount.mockReturnValue(true);

    const { result } = renderHook(() => useIsHardwareWalletForBridge());

    expect(result.current).toBe(true);
    expect(mockIsHardwareAccount).toHaveBeenCalledWith(address);
  });

  it('returns false when source wallet is not a hardware account', () => {
    const address = '0x1234567890123456789012345678901234567890';
    mockUseSelector.mockReturnValue(address);
    mockIsHardwareAccount.mockReturnValue(false);

    const { result } = renderHook(() => useIsHardwareWalletForBridge());

    expect(result.current).toBe(false);
    expect(mockIsHardwareAccount).toHaveBeenCalledWith(address);
  });
});
