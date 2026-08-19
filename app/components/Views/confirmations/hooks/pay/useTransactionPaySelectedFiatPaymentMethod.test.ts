import { renderHook } from '@testing-library/react-hooks';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useTransactionPaySelectedFiatPaymentMethod } from './useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';

jest.mock('./useTransactionPayData');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');

const PAYMENT_METHOD_MOCK = {
  id: 'pm-123',
  name: 'Credit Card',
} as PaymentMethod;

describe('useTransactionPaySelectedFiatPaymentMethod', () => {
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useRampsPaymentMethodsMock = jest.mocked(useRampsPaymentMethods);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [PAYMENT_METHOD_MOCK],
    } as ReturnType<typeof useRampsPaymentMethods>);
  });

  it('returns undefined when no fiat payment is selected', () => {
    const { result } = renderHook(() =>
      useTransactionPaySelectedFiatPaymentMethod(),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns the matching payment method when selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
    });

    const { result } = renderHook(() =>
      useTransactionPaySelectedFiatPaymentMethod(),
    );

    expect(result.current).toStrictEqual(PAYMENT_METHOD_MOCK);
  });

  it('returns undefined when selected ID does not match any payment method', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-nonexistent',
    });

    const { result } = renderHook(() =>
      useTransactionPaySelectedFiatPaymentMethod(),
    );

    expect(result.current).toBeUndefined();
  });
});
