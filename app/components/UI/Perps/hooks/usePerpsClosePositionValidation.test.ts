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
    coin: 'BTC',
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

  it('should return error when full close value is below minimum', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      closePercentage: 100,
      closingValue: 5, // Below minimum of 10
      isPartialClose: false,
      remainingPositionValue: 0,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.validation.minimum_amount', {
        amount: '10',
      }),
    );
  });

  it('should return error when remaining position is below minimum', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      remainingPositionValue: 5, // Below minimum of 10
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.close_position.minimum_remaining_error', {
        minimum: '10',
        remaining: '5.00',
      }),
    );
  });

  it('should return error when user will receive negative amount', async () => {
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

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.close_position.negative_receive_amount'),
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

  it('should return warning for very small partial closes', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    // Use a percentage below the threshold
    const smallPercentage =
      VALIDATION_THRESHOLDS.SMALL_CLOSE_PERCENTAGE_WARNING - 5;

    const params = {
      ...defaultParams,
      closePercentage: smallPercentage,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.warnings).toContain(
      strings('perps.close_position.small_close_warning', {
        percentage: smallPercentage.toString(),
      }),
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
