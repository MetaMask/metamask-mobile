import { renderHook } from '@testing-library/react-native';
import { useCanFiatDepositAsset } from './useCanFiatDepositAsset';
import { useMoneyAccountDepositPaymentMethods } from './useMoneyAccountDepositPaymentMethods';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { pickEligiblePaymentMethod } from '../utils/pickEligiblePaymentMethod';
import type { PaymentMethod } from '@metamask/ramps-controller';

jest.mock('./useMoneyAccountDepositPaymentMethods');
jest.mock('../../../Views/confirmations/hooks/pay/useMMPayFiatConfig');
jest.mock('../utils/pickEligiblePaymentMethod');

const mockUseMoneyAccountDepositPaymentMethods =
  useMoneyAccountDepositPaymentMethods as jest.Mock;
const mockUseMMPayFiatConfig = useMMPayFiatConfig as jest.Mock;
const mockPickEligiblePaymentMethod = pickEligiblePaymentMethod as jest.Mock;

const mockMethod = { id: '/payments/card', name: 'Card' } as PaymentMethod;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMMPayFiatConfig.mockReturnValue({ maxDelayMinutesForPaymentMethods: 10 });
  mockUseMoneyAccountDepositPaymentMethods.mockReturnValue({
    paymentMethods: [mockMethod],
    isReady: true,
    isLoading: false,
  });
  mockPickEligiblePaymentMethod.mockReturnValue(mockMethod);
});

describe('useCanFiatDepositAsset', () => {
  it('returns true when flag on, isReady, and an eligible method exists', () => {
    const { result } = renderHook(() =>
      useCanFiatDepositAsset({ isFiatDepositFlagEnabled: true }),
    );
    expect(result.current).toBe(true);
    expect(mockPickEligiblePaymentMethod).toHaveBeenCalledWith([mockMethod], 10);
  });

  it('returns false when flag is off, regardless of payment methods', () => {
    const { result } = renderHook(() =>
      useCanFiatDepositAsset({ isFiatDepositFlagEnabled: false }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when isReady is false (queries still loading)', () => {
    mockUseMoneyAccountDepositPaymentMethods.mockReturnValue({
      paymentMethods: [],
      isReady: false,
      isLoading: true,
    });
    const { result } = renderHook(() =>
      useCanFiatDepositAsset({ isFiatDepositFlagEnabled: true }),
    );
    expect(result.current).toBe(false);
    expect(mockPickEligiblePaymentMethod).not.toHaveBeenCalled();
  });

  it('returns false when isReady is false due to a network error (fail-closed)', () => {
    mockUseMoneyAccountDepositPaymentMethods.mockReturnValue({
      paymentMethods: [],
      isReady: false,
      isLoading: false,
    });
    const { result } = renderHook(() =>
      useCanFiatDepositAsset({ isFiatDepositFlagEnabled: true }),
    );
    expect(result.current).toBe(false);
  });

  it('returns false when isReady but no eligible payment method exists', () => {
    mockPickEligiblePaymentMethod.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useCanFiatDepositAsset({ isFiatDepositFlagEnabled: true }),
    );
    expect(result.current).toBe(false);
  });

  it('passes maxDelayMinutesForPaymentMethods from config to pickEligiblePaymentMethod', () => {
    mockUseMMPayFiatConfig.mockReturnValue({ maxDelayMinutesForPaymentMethods: 30 });
    renderHook(() => useCanFiatDepositAsset({ isFiatDepositFlagEnabled: true }));
    expect(mockPickEligiblePaymentMethod).toHaveBeenCalledWith([mockMethod], 30);
  });
});
