import { act, renderHook } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { usePerpsProOrderForm } from './usePerpsProOrderForm';

// ---------------------------------------------------------------------------
// Mock scaffolding
// ---------------------------------------------------------------------------
const mockTrack = jest.fn();
const mockShowToast = jest.fn();
const mockNavigate = jest.fn();
const mockSetMaxSlippage = jest.fn();
const mockHandleAddFunds = jest.fn();
const mockCloseEligibilityModal = jest.fn();
const mockUpdatePositionTPSL = jest.fn().mockResolvedValue({ success: true });
const mockExecuteOrder = jest.fn().mockResolvedValue({ success: true });
const mockClearPendingTradeConfiguration = jest.fn();

let mockExecutionOptions: {
  onSuccess?: (position?: unknown) => void;
  onError?: (error: unknown) => void;
} = {};

const mockOrderForm = {
  asset: 'BTC',
  direction: 'long' as 'long' | 'short',
  type: 'market' as 'market' | 'limit',
  amount: '100',
  leverage: 5,
  balancePercent: 10,
  limitPrice: undefined as string | undefined,
  takeProfitPrice: undefined as string | undefined,
  stopLossPrice: undefined as string | undefined,
};

const mockSetAmount = jest.fn();
const mockSetLeverage = jest.fn();
const mockSetDirection = jest.fn();
const mockSetTakeProfitPrice = jest.fn();
const mockSetStopLossPrice = jest.fn();
const mockSetLimitPrice = jest.fn();
const mockSetOrderType = jest.fn();
const mockHandlePercentageAmount = jest.fn();

const mockContextValue = {
  orderForm: mockOrderForm,
  setAmount: mockSetAmount,
  setLeverage: mockSetLeverage,
  setDirection: mockSetDirection,
  setTakeProfitPrice: mockSetTakeProfitPrice,
  setStopLossPrice: mockSetStopLossPrice,
  setLimitPrice: mockSetLimitPrice,
  setOrderType: mockSetOrderType,
  handlePercentageAmount: mockHandlePercentageAmount,
  maxPossibleAmount: 1000,
  balanceForValidation: 500,
};

const mockValidation = {
  isValid: true,
  errors: [] as string[],
  isValidating: false,
};

let mockExistingPosition: {
  leverage?: { type?: string; value?: number };
  size?: string;
} | null = null;

let mockIsAtCap = false;
let mockEstimatedSlippageBps: number | null = 50;

const submitted = jest.fn(() => ({ id: 'submitted' }));
const confirmed = jest.fn(() => ({ id: 'confirmed' }));
const creationFailed = jest.fn(() => ({ id: 'failed' }));
const validationError = jest.fn((message: string) => ({
  id: 'validationError',
  message,
}));
const updateTPSLError = jest.fn((message: string) => ({
  id: 'tpslError',
  message,
}));
const limitPriceRequired = { id: 'limitPriceRequired' };

const mockPerpsToastOptions = {
  orderManagement: {
    market: { submitted, confirmed, creationFailed },
    limit: { submitted, confirmed, creationFailed },
  },
  formValidation: { orderForm: { validationError, limitPriceRequired } },
  positionManagement: { tpsl: { updateTPSLError } },
};

jest.mock('../../../../contexts/PerpsOrderContext', () => ({
  usePerpsOrderContext: () => mockContextValue,
}));

jest.mock('../../../../hooks', () => ({
  useHasExistingPosition: () => ({ existingPosition: mockExistingPosition }),
  usePerpsLiquidationPrice: () => ({ liquidationPrice: '80000' }),
  usePerpsMarketData: () => ({
    marketData: { szDecimals: 3, maxLeverage: 40 },
    isLoading: false,
  }),
  usePerpsOrderExecution: (opts: typeof mockExecutionOptions) => {
    mockExecutionOptions = opts;
    return { placeOrder: mockExecuteOrder, isPlacing: false };
  },
  usePerpsOrderFees: () => ({
    totalFee: 5,
    undiscountedTotalFee: 6,
    metamaskFee: 1,
    metamaskFeeRate: 0.01,
    protocolFeeRate: 0.02,
    originalMetamaskFeeRate: 0.01,
    feeDiscountPercentage: 10,
    estimatedPoints: 100,
  }),
  usePerpsOrderValidation: () => mockValidation,
  usePerpsToasts: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: mockPerpsToastOptions,
  }),
  usePerpsTrading: () => ({ updatePositionTPSL: mockUpdatePositionTPSL }),
}));

jest.mock('../../../../hooks/usePerpsHomeActions', () => ({
  usePerpsHomeActions: () => ({
    handleAddFunds: mockHandleAddFunds,
    isEligibilityModalVisible: false,
    closeEligibilityModal: mockCloseEligibilityModal,
  }),
}));

jest.mock('../../../../hooks/stream', () => ({
  usePerpsLivePrices: () => ({
    BTC: { price: '90000', markPrice: '90000', percentChange24h: '1' },
  }),
  usePerpsTopOfBook: () => ({ bestBid: '89999', bestAsk: '90001' }),
}));

let mockIsInitialized = true;

jest.mock('../../../../hooks/usePerpsConnection', () => ({
  usePerpsConnection: () => ({ isInitialized: mockIsInitialized }),
}));

jest.mock('../../../../hooks/usePerpsEstimatedSlippage', () => ({
  usePerpsEstimatedSlippage: () => ({
    estimatedSlippageBps: mockEstimatedSlippageBps,
  }),
}));

jest.mock('../../../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../../hooks/usePerpsMaxSlippage', () => ({
  usePerpsMaxSlippage: () => ({
    maxSlippageBps: 100,
    maxSlippageSource: 'default',
    setMaxSlippage: mockSetMaxSlippage,
  }),
}));

jest.mock('../../../../hooks/usePerpsOICap', () => ({
  usePerpsOICap: () => ({ isAtCap: mockIsAtCap }),
}));

jest.mock('../../../../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => 1,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-redux', () => ({
  useSelector: () => false,
}));

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      clearPendingTradeConfiguration: (...args: unknown[]) =>
        mockClearPendingTradeConfiguration(...args),
    },
  },
}));

const market = { symbol: 'BTC', name: 'Bitcoin' } as PerpsMarketData;

const renderProForm = () => renderHook(() => usePerpsProOrderForm({ market }));

describe('usePerpsProOrderForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionOptions = {};
    mockOrderForm.type = 'market';
    mockOrderForm.direction = 'long';
    mockOrderForm.amount = '100';
    mockOrderForm.leverage = 5;
    mockOrderForm.limitPrice = undefined;
    mockOrderForm.takeProfitPrice = undefined;
    mockOrderForm.stopLossPrice = undefined;
    mockValidation.isValid = true;
    mockValidation.errors = [];
    mockExistingPosition = null;
    mockIsAtCap = false;
    mockEstimatedSlippageBps = 50;
    mockIsInitialized = true;
    mockUpdatePositionTPSL.mockResolvedValue({ success: true });
  });

  describe('availableBalance', () => {
    it('formats spendable balance as "$amount available" when connected', () => {
      const { result } = renderProForm();

      expect(result.current.availableBalance).toMatch(/^\$500 available$/);
    });

    it('shows the unavailable placeholder before Perps is initialized', () => {
      mockIsInitialized = false;

      const { result } = renderProForm();

      expect(result.current.availableBalance).toBe('-- available');
    });
  });

  describe('summary', () => {
    it('builds display-ready margin, liquidation, slippage and numeric fees', () => {
      // Arrange / Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.summary.margin).toMatch(/\$/);
      expect(result.current.summary.liquidationPrice).toMatch(/\$/);
      expect(result.current.summary.slippage).toContain('Max: 1%');
      expect(result.current.summary.fee).toBe(5);
      expect(result.current.summary.originalFee).toBe(6);
      expect(result.current.summary.feeDiscountPercentage).toBe(10);
    });

    it('shows the fallback liquidation display when amount is empty', () => {
      // Arrange
      mockOrderForm.amount = '0';

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.summary.liquidationPrice).toBe('--');
    });
  });

  describe('notices', () => {
    it('maps a validation error to an inline notice', () => {
      // Arrange
      mockValidation.isValid = false;
      mockValidation.errors = ['Insufficient funds'];

      // Act
      const { result } = renderProForm();

      // Assert
      const inline = result.current.notices.find((n) => n.variant === 'inline');
      expect(inline?.message).toBe('Insufficient funds');
    });

    it('maps an OI cap to a banner notice', () => {
      // Arrange
      mockIsAtCap = true;

      // Act
      const { result } = renderProForm();

      // Assert
      const banner = result.current.notices.find((n) => n.id === 'oi-cap');
      expect(banner?.variant).toBe('banner');
    });

    it('shows the sl-liq-risk notice when the stop loss risks liquidation', () => {
      // Arrange: long, market 90000, liquidation 80000 — SL at 79000 is past liq
      mockOrderForm.stopLossPrice = '79000';
      const { result } = renderProForm();

      // Assert
      expect(
        result.current.notices.find((n) => n.id === 'sl-liq-risk'),
      ).toBeDefined();
    });

    it('shows the tp-invalid notice when the take profit is on the wrong side', () => {
      // Arrange: long, market 90000 — TP below market is wrong side
      mockOrderForm.takeProfitPrice = '85000';
      const { result } = renderProForm();

      // Assert
      expect(
        result.current.notices.find((n) => n.id === 'tp-invalid'),
      ).toBeDefined();
    });

    it('shows the sl-invalid notice when the stop loss is on the wrong side', () => {
      // Arrange: long, market 90000 — SL above market is wrong side
      mockOrderForm.stopLossPrice = '95000';
      const { result } = renderProForm();

      // Assert
      expect(
        result.current.notices.find((n) => n.id === 'sl-invalid'),
      ).toBeDefined();
    });
  });

  describe('handlePlaceOrder', () => {
    it('builds OrderParams including reduceOnly and calls executeOrder', async () => {
      // Arrange
      const { result } = renderProForm();
      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params).toMatchObject({
        symbol: 'BTC',
        isBuy: true,
        orderType: 'market',
        usdAmount: '100',
        reduceOnly: true,
      });
      expect(submitted).toHaveBeenCalled();
      expect(mockClearPendingTradeConfiguration).toHaveBeenCalledWith('BTC');
      // No success navigation
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('blocks submit and shows a toast when validation is invalid', async () => {
      // Arrange
      mockValidation.isValid = false;
      mockValidation.errors = ['Bad order'];
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith('Bad order');
    });

    it('navigates to the cross-margin warning and aborts', async () => {
      // Arrange
      mockExistingPosition = { leverage: { type: 'cross', value: 5 } };
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('aborts and tracks when the estimated slippage exceeds the max', async () => {
      // Arrange: estimate 500 bps > max 100 bps
      mockEstimatedSlippageBps = 500;
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalled();
    });

    it('aborts submit when the stop loss risks liquidation (doesStopLossRiskLiquidation guard)', async () => {
      // Arrange: long, liquidation 80000 — SL at 79000 is past liquidation
      mockOrderForm.stopLossPrice = '79000';
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('skips updatePositionTPSL and clearPendingConfig when the order fails (shouldHandleTPSLSeparately path)', async () => {
      // Arrange: new market position with TP triggers the separate-TP/SL branch;
      // controller returns failure so post-processing must not run
      mockOrderForm.takeProfitPrice = '95000';
      mockExecuteOrder.mockResolvedValueOnce({
        success: false,
        error: 'rejected',
      });
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockUpdatePositionTPSL).not.toHaveBeenCalled();
      expect(mockClearPendingTradeConfiguration).not.toHaveBeenCalled();
    });

    it('skips clearPendingConfig when the order fails (plain else path)', async () => {
      // Arrange: no TP/SL, controller returns failure
      mockExecuteOrder.mockResolvedValueOnce({
        success: false,
        error: 'rejected',
      });
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockClearPendingTradeConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('execution toasts', () => {
    it('shows the confirmed toast on success', () => {
      // Arrange
      renderProForm();

      // Act
      act(() => {
        mockExecutionOptions.onSuccess?.();
      });

      // Assert
      expect(confirmed).toHaveBeenCalled();
    });

    it('shows the creation-failed toast on error', () => {
      // Arrange
      renderProForm();

      // Act
      act(() => {
        mockExecutionOptions.onError?.(new Error('boom'));
      });

      // Assert
      expect(creationFailed).toHaveBeenCalled();
    });
  });

  describe('TP/SL handling', () => {
    it('places the order without TP/SL then updates position TP/SL when flagged', async () => {
      // Arrange: new market position with TP set -> handled separately
      mockOrderForm.takeProfitPrice = '95000';
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params.takeProfitPrice).toBeUndefined();
      expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
        symbol: 'BTC',
        takeProfitPrice: '95000',
        stopLossPrice: undefined,
      });
    });

    it('shows an error toast when the separate TP/SL update fails', async () => {
      // Arrange
      mockOrderForm.takeProfitPrice = '95000';
      mockUpdatePositionTPSL.mockResolvedValue({
        success: false,
        error: 'nope',
      });
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(updateTPSLError).toHaveBeenCalledWith('nope');
    });
  });

  describe('limit orders', () => {
    it('sets the limit price and the fixed limit slippage on OrderParams', async () => {
      // Arrange
      mockOrderForm.type = 'limit';
      mockOrderForm.limitPrice = '80000';
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params.price).toBe('80000');
      expect(params.orderType).toBe('limit');
    });
  });

  describe('additional notices', () => {
    it('flags TP invalid, SL invalid and SL-liquidation-risk as inline notices', () => {
      // Arrange: long order, current price 90000, liquidation 80000
      mockOrderForm.takeProfitPrice = '2000'; // below market -> invalid
      mockOrderForm.stopLossPrice = '70000'; // below liq -> risk (and valid side)
      const { result } = renderProForm();

      // Act
      const ids = result.current.notices.map((n) => n.id);

      // Assert
      expect(ids).toContain('tp-invalid');
      expect(ids).toContain('sl-liq-risk');
    });
  });

  describe('summary slippage', () => {
    it('hides the slippage row for limit orders', () => {
      // Arrange: limit orders force DefaultLimitSlippageBps in buildPerpsOrderParams
      // so the user-configured cap has no effect; the row is hidden to avoid misrepresentation.
      mockOrderForm.type = 'limit';
      mockEstimatedSlippageBps = null;
      const { result } = renderProForm();

      // Assert
      expect(result.current.summary.slippage).toBeUndefined();
      expect(result.current.summary.onSlippagePress).toBeUndefined();
    });

    it('shows a pending slippage row for market orders when no estimate is available', () => {
      // Arrange: market order — estimate not yet available from the order book
      mockEstimatedSlippageBps = null;
      const { result } = renderProForm();

      // Assert
      expect(typeof result.current.summary.slippage).toBe('string');
      expect(result.current.summary.slippage?.length).toBeGreaterThan(0);
    });
  });

  describe('isPlaceOrderDisabled', () => {
    it('is disabled at the OI cap', () => {
      // Arrange
      mockIsAtCap = true;
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('is enabled for a valid, uncapped order', () => {
      // Arrange / Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(false);
    });

    it('is disabled when the stop loss risks liquidation', () => {
      // Arrange: long, liquidation 80000 — SL at 79000 sits past liquidation
      mockOrderForm.stopLossPrice = '79000';
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('is disabled when the take profit is on the wrong side', () => {
      // Arrange: long, market 90000 — TP below market price is invalid
      mockOrderForm.takeProfitPrice = '85000';
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('is disabled when the stop loss is on the wrong side', () => {
      // Arrange: long, market 90000 — SL above market price is invalid
      mockOrderForm.stopLossPrice = '95000';
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });
  });

  describe('handlers', () => {
    it('navigates to the TP/SL screen and its onConfirm sets TP/SL', async () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onTPSLPress();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const onConfirm = mockNavigate.mock.calls[0][1].onConfirm;
      await act(async () => {
        await onConfirm(undefined, '95000', '80000');
      });
      expect(mockSetTakeProfitPrice).toHaveBeenCalledWith('95000');
      expect(mockSetStopLossPrice).toHaveBeenCalledWith('80000');
    });

    it('shows the limit-price-required toast and does not navigate for a limit order without a price', () => {
      // Arrange
      mockOrderForm.type = 'limit';
      mockOrderForm.limitPrice = undefined;
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onTPSLPress();
      });

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(limitPriceRequired);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('confirms leverage, clamps an over-max amount, and tracks the change', () => {
      // Arrange: amount 6000 > spendable(500) * leverage(10) = 5000
      mockOrderForm.amount = '6000';
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLeverageConfirm(10, 'slider');
      });

      // Assert
      expect(mockSetLeverage).toHaveBeenCalledWith(10);
      expect(mockSetAmount).toHaveBeenCalledWith('5000');
      expect(mockTrack).toHaveBeenCalled();
    });

    it('saves slippage and opens the slippage sheet', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onSlippageSave(200);
      });
      act(() => {
        result.current.summary.onSlippagePress?.();
      });

      // Assert
      expect(mockSetMaxSlippage).toHaveBeenCalledWith(200);
      expect(mockTrack).toHaveBeenCalled();
    });

    it('selects an order type', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onOrderTypeSelect('limit');
      });

      // Assert
      expect(mockSetOrderType).toHaveBeenCalledWith('limit');
    });

    it('ignores size input over nine digits and forwards valid input', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.sizeInput.onChange('1234567890'); // 10 digits -> ignored
      });
      expect(mockSetAmount).not.toHaveBeenCalled();
      act(() => {
        result.current.sizeInput.onChange('1234'); // valid
      });

      // Assert
      expect(mockSetAmount).toHaveBeenCalledWith('1234');
    });

    it('ignores limit price input over nine digits and forwards valid input', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceChange('1234567890'); // 10 digits -> ignored
      });
      expect(mockSetLimitPrice).not.toHaveBeenCalled();
      act(() => {
        result.current.onLimitPriceChange('1234.56'); // valid
      });

      // Assert
      expect(mockSetLimitPrice).toHaveBeenCalledWith('1234.56');
    });

    it('normalizes leading zeroes in limit price input', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceChange('0012.5');
      });

      // Assert
      expect(mockSetLimitPrice).toHaveBeenCalledWith('12.5');
    });

    it('rejects repeated decimal separators in limit price input', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceChange('1.2.3');
      });

      // Assert
      expect(mockSetLimitPrice).not.toHaveBeenCalled();
    });

    it('sets the limit price from the live mid', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onUseMidPricePress();
      });

      // Assert
      expect(mockSetLimitPrice).toHaveBeenCalled();
    });

    it('previews a slider percentage before committing USD on drag end', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onBalancePercentageChange(50);
      });
      expect(mockSetAmount).not.toHaveBeenCalled();
      act(() => {
        result.current.onBalancePercentageDragEnd();
      });

      // Assert
      expect(mockSetAmount).toHaveBeenCalledWith('500');
    });

    it('forwards the direction and add-funds handlers', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onDirectionChange('short');
      });
      act(() => {
        result.current.onAddFundsPress();
      });

      // Assert
      expect(mockSetDirection).toHaveBeenCalledWith('short');
      expect(mockHandleAddFunds).toHaveBeenCalled();
    });
  });
});
