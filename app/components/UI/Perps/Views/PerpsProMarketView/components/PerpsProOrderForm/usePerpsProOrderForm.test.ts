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
const mockExecuteOrder = jest.fn().mockResolvedValue(undefined);
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

jest.mock('../../../../hooks/usePerpsConnection', () => ({
  usePerpsConnection: () => ({ isInitialized: true }),
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
    mockUpdatePositionTPSL.mockResolvedValue({ success: true });
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
  });
});
