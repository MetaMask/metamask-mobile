import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import type { AssetType } from '../../../Views/confirmations/types/token';
import { usePerpsPaymentToken } from './usePerpsPaymentToken';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayToken');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));

const mockUseTransactionPayToken =
  useTransactionPayToken as jest.MockedFunction<typeof useTransactionPayToken>;
const mockSetSelectedPaymentToken = Engine.context.PerpsController
  ?.setSelectedPaymentToken as jest.Mock;

describe('usePerpsPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionPayToken.mockReturnValue({
      setPayToken: jest.fn(),
    } as unknown as ReturnType<typeof useTransactionPayToken>);
  });

  it('returns onPaymentTokenChange function', () => {
    const { result } = renderHook(() => usePerpsPaymentToken());

    expect(result.current.onPaymentTokenChange).toBeDefined();
    expect(typeof result.current.onPaymentTokenChange).toBe('function');
  });

  it('calls setSelectedPaymentToken with null when token is null', () => {
    const { result } = renderHook(() => usePerpsPaymentToken());

    act(() => {
      result.current.onPaymentTokenChange(null);
    });

    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith(null);
  });

  it('calls setSelectedPaymentToken with null when token is undefined', () => {
    const { result } = renderHook(() => usePerpsPaymentToken());

    act(() => {
      result.current.onPaymentTokenChange(undefined as unknown as null);
    });

    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith(null);
  });

  it('calls setSelectedPaymentToken and setPayToken when token has address and chainId', () => {
    const setPayTokenMock = jest.fn();
    mockUseTransactionPayToken.mockReturnValue({
      setPayToken: setPayTokenMock,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    const { result } = renderHook(() => usePerpsPaymentToken());
    const token = {
      address: '0xusdc',
      chainId: '0xa4b1',
      symbol: 'USDC',
    } as AssetType;

    act(() => {
      result.current.onPaymentTokenChange(token);
    });

    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith({
      address: '0xusdc',
      chainId: '0xa4b1',
    });
    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });
});
