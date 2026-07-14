import { renderHook, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { usePerpsClosePositionValidation } from './usePerpsClosePositionValidation';
import { usePerpsTrading } from './usePerpsTrading';
import { VALIDATION_THRESHOLDS } from '@metamask/perps-controller';

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
      (1 + VALIDATION_THRESHOLDS.LimitPriceDifferenceWarning + 0.1);

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

  it('values a limit close at the limit price (not the mark) for protocol validation', async () => {
    // A limit close rests at the limit price, so the protocol's
    // minimum-notional check must value it at the limit price. A limit price
    // far above the mark previously made the mark-priced notional fall below
    // the minimum and silently disabled the button.
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: '1000',
      currentPrice: 65.288, // live mark price, far below the limit price
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(mockValidateClosePosition).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'limit',
        price: '1000',
        currentPrice: 1000,
      }),
    );
  });

  it('values a market close at the mark price for protocol validation', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      orderType: 'market' as const,
      limitPrice: undefined,
      currentPrice: 65.288,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(mockValidateClosePosition).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'market',
        currentPrice: 65.288,
      }),
    );
  });

  it('returns error when the limit price is far above the reference price band', async () => {
    // 999999999 is a valid integer for HyperLiquid but is far beyond the 95%
    // band from the 50000 reference price, so HyperLiquid would reject it
    // ("oracleRejected"). The Close button must be blocked.
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: '999999999',
      currentPrice: 50000,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.limit_price_modal.limit_price_too_far'),
    );
  });

  it('returns error when the limit price is far below the reference price band', async () => {
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: '100', // 0.2% of the 50000 reference, below the 5% floor
      currentPrice: 50000,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.limit_price_modal.limit_price_too_far'),
    );
  });

  it('uses the reference (mark) price, not the mid currentPrice, for the band', async () => {
    // currentPrice (mid) equals the limit price, so a currentPrice-based check
    // would pass. The mark reference price is far away, which is what the
    // protocol's oracle band evaluates against, so the close must be blocked.
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const params = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: '1000',
      currentPrice: 1000,
      referencePrice: 50000,
    };

    const { result } = renderHook(() =>
      usePerpsClosePositionValidation(params),
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain(
      strings('perps.order.limit_price_modal.limit_price_too_far'),
    );
  });

  it('re-evaluates the price band when the market moves after the limit price is set', async () => {
    // Reviewer scenario: a valid limit price is set, then the market moves
    // beyond the boundary. The Close button validation must re-run and block.
    mockValidateClosePosition.mockResolvedValue({ isValid: true });

    const baseParams = {
      ...defaultParams,
      orderType: 'limit' as const,
      limitPrice: '50000',
      currentPrice: 50000,
      referencePrice: 50000,
    };

    const { result, rerender } = renderHook(
      (props: Parameters<typeof usePerpsClosePositionValidation>[0]) =>
        usePerpsClosePositionValidation(props),
      { initialProps: baseParams },
    );

    // Initially within the band → no too-far error
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });
    expect(result.current.errors).not.toContain(
      strings('perps.order.limit_price_modal.limit_price_too_far'),
    );

    // Market crashes far below the resting limit price, pushing it out of band
    rerender({ ...baseParams, currentPrice: 2000, referencePrice: 2000 });

    await waitFor(() => {
      expect(result.current.errors).toContain(
        strings('perps.order.limit_price_modal.limit_price_too_far'),
      );
    });
    expect(result.current.isValid).toBe(false);
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
