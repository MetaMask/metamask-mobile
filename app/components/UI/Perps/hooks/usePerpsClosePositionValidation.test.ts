import { renderHook, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { usePerpsClosePositionValidation } from './usePerpsClosePositionValidation';
import { usePerpsTrading } from './usePerpsTrading';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';

jest.mock('./usePerpsTrading');

describe('usePerpsClosePositionValidation', () => {
  const mockValidateClosePosition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      validateClosePosition: mockValidateClosePosition,
    });
  });

  const defaultParams = {
    symbol: 'BTC',
    closePercentage: 50,
    closeAmount: '0.5',
    orderType: 'market' as const,
    limitPrice: undefined,
    currentPrice: 50000,
    positionSize: 1,
    positionValue: 50000,
    minimumOrderAmount: 10,
    closingValue: 25000,
    remainingPositionValue: 25000,
    receiveAmount: 24900,
    isPartialClose: true,
  };

  it('should return valid state when all validations pass', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(defaultParams),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
    expect(result.current.warnings).toEqual([]);
  });

  it('should return error when protocol validation fails', async () => {
    const errorMessage = 'Protocol validation error';
    mockValidateClosePosition.mockResolvedValue({
      isValid: false,
      error: errorMessage,
    });

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(defaultParams),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(errorMessage);
  });

  it('should allow full close regardless of value', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      closePercentage: 100,
      closingValue: 5, // Below minimum of 10 but should be allowed for full close
      isPartialClose: false,
      remainingPositionValue: 0,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should allow partial close even if remaining position is below minimum', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      remainingPositionValue: 5,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('returns warning (not error) when user will receive negative amount', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      receiveAmount: -100, // Negative receive amount
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
    expect(result.current.warnings).toContain(
      strings('perps.close_position.negative_receive_warning', {
        amount: '100.00',
      }),
    );
  });

  it('should return error for limit order without price from protocol', async () => {
    // Protocol validation should catch missing limit price
    mockValidateClosePosition.mockResolvedValue({
      isValid: false,
      error: strings('perps.order.validation.limit_price_required'),
    });

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: undefined,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.validation.limit_price_required'),
    );
  });

  it('should return warning for limit price far from current price', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    // Calculate price that's above the threshold
    const currentPrice = defaultParams.currentPrice;
    const priceAboveThreshold =
      currentPrice *
      (1 + VALIDATION_THRESHOLDS.LIMIT_PRICE_DIFFERENCE_WARNING + 0.1);

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: priceAboveThreshold.toString(),
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.warnings).toContain(
      strings('perps.order.validation.limit_price_far_warning'),
    );
  });

  it('should return error for market order with 0% close', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      closePercentage: 0,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.close_position.no_amount_selected'),
    );
  });

  it('should handle validation errors gracefully', async () => {
    mockValidateClosePosition.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(defaultParams),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.validation.error'),
    );
  });
});
