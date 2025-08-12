import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { useAccountNativeBalance } from './useAccountNativeBalance';


jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));

jest.mock('../../../../selectors/accountTrackerController');

describe('useAccountNativeBalance', () => {
  const mockChainId = '0x1' as Hex;
  const mockAddress = '0x123456789';
  const mockLowerAddress = mockAddress.toLowerCase();
  const mockBalance = '0xff';

  const mockAccountsByChainId = {
    [mockChainId]: {
      [mockLowerAddress]: {
        balance: mockBalance,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectAccountsByChainId) {
        return mockAccountsByChainId;
      }
      return undefined;
    });
  });

  it('returns correct balance for valid chainId and address', () => {
    const { result } = renderHook(() =>
      useAccountNativeBalance(mockChainId, mockAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: mockBalance,
    });
  });

  it('returns 0x0 balance when chainId is undefined', () => {
    const { result } = renderHook(() =>
      useAccountNativeBalance(undefined as unknown as Hex, mockAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: '0x0',
    });
  });

  it('returns 0x0 balance when address is undefined', () => {
    const { result } = renderHook(() =>
      useAccountNativeBalance(mockChainId, undefined as unknown as string)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: '0x0',
    });
  });

  it('handles case-insensitive address matching', () => {
    const upperCaseAddress = mockAddress.toUpperCase();
    const { result } = renderHook(() =>
      useAccountNativeBalance(mockChainId, upperCaseAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: mockBalance,
    });
  });

  it('returns 0x0 balance when accountsByChainId is undefined', () => {
    (useSelector as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useAccountNativeBalance(mockChainId, mockAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: '0x0',
    });
  });

  it('returns 0x0 balance when chain not found', () => {
    const nonExistentChainId = '0x2' as Hex;
    const { result } = renderHook(() =>
      useAccountNativeBalance(nonExistentChainId, mockAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: '0x0',
    });
  });

  it('returns 0x0 balance when address not found for chain', () => {
    const nonExistentAddress = '0x987654321';
    const { result } = renderHook(() =>
      useAccountNativeBalance(mockChainId, nonExistentAddress)
    );

    expect(result.current).toEqual({
      balanceWeiInHex: '0x0',
    });
  });
});
