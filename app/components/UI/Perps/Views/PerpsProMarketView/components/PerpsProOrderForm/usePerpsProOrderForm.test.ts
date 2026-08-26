import { act, renderHook } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { PERPS_ANALYTICS_PREVIOUS_LEVERAGE } from '../../../../constants/perpsAnalytics';
import type { OrderFormFieldIssue } from '../../../../utils/triggerOrderValidation';
import { ImpactMoment, playImpact } from '../../../../../../../util/haptics';
import { strings } from '../../../../../../../../locales/i18n';
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
const mockShowEligibilityModal = jest.fn();
const mockUpdatePositionTPSL = jest.fn().mockResolvedValue({ success: true });
const mockExecuteOrder = jest.fn().mockResolvedValue({ success: true });
const mockClearPendingTradeConfiguration = jest.fn();
const mockComplianceGate = jest.fn((action: () => Promise<unknown>) =>
  action(),
);

let mockIsEligible = true;

let mockExecutionOptions: {
  onSuccess?: (position?: unknown) => void;
  onError?: (error: unknown) => void;
} = {};

const mockOrderForm = {
  asset: 'BTC',
  direction: 'long' as 'long' | 'short',
  type: 'market' as
    | 'market'
    | 'limit'
    | 'stop_market'
    | 'stop_limit'
    | 'take_profit_limit'
    | 'take_profit_market',
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
const mockCommitLimitPrice = jest.fn();
const mockCommitTriggerPrice = jest.fn();
const mockSetTriggerPrice = jest.fn();
const mockSetOrderType = jest.fn();
const mockHandlePercentageAmount = jest.fn();
const mockUpdateOrderForm = jest.fn();
const mockSetMaxPossibleAmountOverride = jest.fn();

const mockContextValue = {
  orderForm: mockOrderForm,
  updateOrderForm: mockUpdateOrderForm,
  setAmount: mockSetAmount,
  setLeverage: mockSetLeverage,
  setDirection: mockSetDirection,
  setTakeProfitPrice: mockSetTakeProfitPrice,
  setStopLossPrice: mockSetStopLossPrice,
  setLimitPrice: mockSetLimitPrice,
  commitLimitPrice: mockCommitLimitPrice,
  commitTriggerPrice: mockCommitTriggerPrice,
  hasBlurredLimitPrice: false,
  hasBlurredTriggerPrice: false,
  triggerPrice: undefined as string | undefined,
  setTriggerPrice: mockSetTriggerPrice,
  setOrderType: mockSetOrderType,
  handlePercentageAmount: mockHandlePercentageAmount,
  maxPossibleAmount: 1000,
  setMaxPossibleAmountOverride: mockSetMaxPossibleAmountOverride,
  balanceForValidation: 500,
};

const mockValidation = {
  isValid: true,
  errors: [] as string[],
  fieldIssues: [] as OrderFormFieldIssue[],
  isValidating: false,
  validateNow: jest.fn().mockResolvedValue({
    errors: [],
    warnings: [],
    fieldIssues: [],
    isValid: true,
  }),
};

let mockExistingPosition: {
  leverage?: { type?: string; value?: number };
  size?: string;
} | null = null;

let mockIsAtCap = false;
let mockEstimatedSlippageBps: number | null = 50;
let mockMaxSlippageBps = 100;
let mockMaxSlippageSource = 'default';
let mockLivePrice = '90000';
let mockLiveMarkPrice = '90000';

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

let mockPositionStreamLoading = false;
let mockMarketDataLoading = false;
let mockMarketDataError: string | null = null;
let mockMarketData: { szDecimals: number; maxLeverage: number } | null = {
  szDecimals: 3,
  maxLeverage: 40,
};
let mockIsPlacing = false;

jest.mock('../../../../hooks', () => ({
  useHasExistingPosition: () => ({
    existingPosition: mockExistingPosition,
    isLoading: mockPositionStreamLoading,
  }),
  usePerpsLiquidationPrice: () => ({ liquidationPrice: '80000' }),
  usePerpsMarketData: () => ({
    marketData: mockMarketData,
    isLoading: mockMarketDataLoading,
    error: mockMarketDataError,
  }),
  usePerpsOrderExecution: (opts: typeof mockExecutionOptions) => {
    mockExecutionOptions = opts;
    return { placeOrder: mockExecuteOrder, isPlacing: mockIsPlacing };
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
    isEligible: mockIsEligible,
    isEligibilityModalVisible: false,
    closeEligibilityModal: mockCloseEligibilityModal,
    showEligibilityModal: mockShowEligibilityModal,
  }),
}));

jest.mock('../../../../../Compliance', () => ({
  useComplianceGate: () => ({
    gate: mockComplianceGate,
    isBlocked: false,
    isComplianceEnabled: false,
    checkCompliance: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/stream', () => ({
  usePerpsLivePrices: () => ({
    BTC: {
      price: mockLivePrice,
      markPrice: mockLiveMarkPrice,
      percentChange24h: '1',
    },
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
    maxSlippageBps: mockMaxSlippageBps,
    maxSlippageSource: mockMaxSlippageSource,
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

jest.mock('../../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../../../../util/haptics');

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      clearPendingTradeConfiguration: (...args: unknown[]) =>
        mockClearPendingTradeConfiguration(...args),
    },
  },
}));

const market = { symbol: 'BTC', name: 'Bitcoin' } as PerpsMarketData;

const renderProForm = (isTriggeredOrdersEnabled = true) =>
  renderHook(() => usePerpsProOrderForm({ market, isTriggeredOrdersEnabled }));

describe('usePerpsProOrderForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionOptions = {};
    mockOrderForm.type = 'market';
    mockOrderForm.direction = 'long';
    mockOrderForm.amount = '100';
    mockOrderForm.leverage = 5;
    mockOrderForm.limitPrice = undefined;
    mockContextValue.triggerPrice = undefined;
    mockContextValue.hasBlurredLimitPrice = false;
    mockContextValue.hasBlurredTriggerPrice = false;
    mockOrderForm.takeProfitPrice = undefined;
    mockOrderForm.stopLossPrice = undefined;
    mockValidation.isValid = true;
    mockValidation.isValidating = false;
    mockValidation.errors = [];
    mockValidation.fieldIssues = [];
    mockValidation.validateNow.mockResolvedValue({
      errors: [],
      warnings: [],
      fieldIssues: [],
      isValid: true,
    });
    mockExistingPosition = null;
    mockIsAtCap = false;
    mockEstimatedSlippageBps = 50;
    mockMaxSlippageBps = 100;
    mockMaxSlippageSource = 'default';
    mockLivePrice = '90000';
    mockLiveMarkPrice = '90000';
    mockIsInitialized = true;
    mockPositionStreamLoading = false;
    mockMarketDataLoading = false;
    mockMarketDataError = null;
    mockMarketData = { szDecimals: 3, maxLeverage: 40 };
    mockIsPlacing = false;
    mockIsEligible = true;
    mockComplianceGate.mockImplementation((action: () => Promise<unknown>) =>
      action(),
    );
    mockCommitLimitPrice.mockImplementation((price?: string) => {
      mockOrderForm.limitPrice = price;
      mockContextValue.hasBlurredLimitPrice = true;
    });
    mockCommitTriggerPrice.mockImplementation((price?: string) => {
      mockContextValue.triggerPrice = price;
      mockContextValue.hasBlurredTriggerPrice = true;
    });
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
    it('maps a margin validation error to a priority banner', () => {
      // Arrange
      mockValidation.isValid = false;
      mockValidation.errors = ['Insufficient funds'];

      // Act
      const { result } = renderProForm();

      // Assert
      const banner = result.current.notices.find((n) => n.id === 'margin');
      expect(banner?.variant).toBe('banner');
      expect(banner?.message).toBe('Insufficient funds');
    });

    it('keeps an empty amount blocked without an inline message', () => {
      // Arrange
      mockOrderForm.amount = '0';
      mockValidation.isValid = false;
      mockValidation.errors = [];

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.notices).toEqual([]);
      expect(result.current.isPlaceOrderDisabled).toBe(true);

      act(() => {
        result.current.sizeInput.onBlur();
      });

      expect(result.current.notices).toEqual([]);
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('blocks after submit without an inline amount message', async () => {
      // Arrange
      mockOrderForm.amount = '0';
      mockValidation.isValid = false;
      mockValidation.errors = [];
      mockValidation.validateNow.mockResolvedValue({
        errors: [],
        warnings: [],
        fieldIssues: [],
        isValid: false,
      });
      const { result } = renderProForm();

      expect(result.current.notices).toEqual([]);
      expect(result.current.isPlaceOrderDisabled).toBe(true);

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.error'),
      );
      expect(result.current.notices).toEqual([]);
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('shows a loading message while market data is loading', () => {
      // Arrange
      mockMarketData = null;
      mockMarketDataLoading = true;

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.notices).toContainEqual({
        id: 'market-data',
        variant: 'banner',
        message: strings('perps.order.validation.market_data_loading'),
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('shows a loading message while the live market price is unavailable', () => {
      // Arrange
      mockLivePrice = '';

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.notices).toContainEqual({
        id: 'market-data',
        variant: 'banner',
        message: strings('perps.order.validation.market_data_loading'),
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('shows a failure message when market data loading fails', () => {
      // Arrange
      mockMarketDataError = 'Market data request failed';

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.notices).toContainEqual({
        id: 'market-data',
        variant: 'banner',
        message: strings('perps.failed_to_load_market_data'),
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
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

    it('shows the reduce-only no-position banner and suppresses TP/SL notices', () => {
      mockOrderForm.takeProfitPrice = '85000';
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(
        result.current.notices.find((n) => n.id === 'reduce-only')?.message,
      ).toBe(
        'You need to have an open position in this market to place reduce-only orders',
      );
      expect(
        result.current.notices.find((n) => n.id === 'tp-invalid'),
      ).toBeUndefined();
    });

    it('shows the reduce-only wrong-side banner for same-direction orders', () => {
      mockExistingPosition = {
        size: '1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(
        result.current.notices.find((n) => n.id === 'reduce-only')?.message,
      ).toBe(
        'Reduce-only orders can only reduce an existing position. Switch to the opposite side.',
      );
    });

    it('shows the reduce-only too-large banner and disables submit when size exceeds position', () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      mockOrderForm.amount = '100000';
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(
        result.current.notices.find((n) => n.id === 'reduce-only')?.message,
      ).toBe('Reduce only order is larger than your open position');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('shows a position-loading notice while suppressing stale validation errors', () => {
      // Arrange: retain a prior margin error (skipValidation freezes errors)
      // while the position is still loading after Reduce Only is enabled.
      mockValidation.isValid = false;
      mockValidation.errors = ['Insufficient funds'];
      mockPositionStreamLoading = true;
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      // Assert: no stale margin/limit banner, and Place Order stays disabled.
      expect(
        result.current.notices.find((n) => n.id === 'margin'),
      ).toBeUndefined();
      expect(
        result.current.notices.find((n) => n.id === 'position-loading')
          ?.message,
      ).toBe('Loading positions...');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });
  });

  describe('handlePlaceOrder', () => {
    it('executes order for an eligible compliant user', async () => {
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockComplianceGate).toHaveBeenCalledTimes(1);
      expect(mockShowEligibilityModal).not.toHaveBeenCalled();
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
    });

    it('keeps haptics silent for a duplicate submit', async () => {
      let resolveOrder:
        | ((value: { success: boolean; error?: string }) => void)
        | undefined;
      mockExecuteOrder.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrder = resolve;
        }),
      );
      const { result } = renderProForm();

      let firstSubmission: Promise<unknown> | undefined;
      await act(async () => {
        firstSubmission = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);

      await act(async () => {
        resolveOrder?.({ success: false, error: 'rejected' });
        await firstSubmission;
      });
    });

    it('opens geo-block modal and skips execution for an ineligible user', async () => {
      mockIsEligible = false;
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockComplianceGate).toHaveBeenCalledTimes(1);
      expect(mockShowEligibilityModal).toHaveBeenCalledWith(
        PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION,
      );
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('skips geo handling and execution when compliance gate blocks', async () => {
      mockComplianceGate.mockResolvedValue(undefined);
      mockIsEligible = false;
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockComplianceGate).toHaveBeenCalledTimes(1);
      expect(mockShowEligibilityModal).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('commits pending slider preview without invoking compliance or submitting', async () => {
      const { result, rerender } = renderProForm();
      act(() => {
        result.current.sizeSlider.onValueChange(250);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockSetAmount).toHaveBeenCalledWith('250');
      expect(mockComplianceGate).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();

      mockOrderForm.amount = '250';
      mockIsEligible = false;
      rerender({});

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockComplianceGate).toHaveBeenCalledTimes(1);
      expect(mockShowEligibilityModal).toHaveBeenCalledWith(
        PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION,
      );
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('builds OrderParams including reduceOnly and calls executeOrder', async () => {
      // Arrange: long form reduces a short position; stale TP must be ignored.
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      mockOrderForm.takeProfitPrice = '95000';
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
      expect(params).not.toHaveProperty('takeProfitPrice');
      expect(mockUpdatePositionTPSL).not.toHaveBeenCalled();
      expect(submitted).toHaveBeenCalled();
      expect(mockClearPendingTradeConfiguration).toHaveBeenCalledWith('BTC');
      expect(mockUpdateOrderForm).toHaveBeenCalledWith({
        amount: '',
        direction: 'long',
        type: 'market',
        balancePercent: 0,
        limitPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      });
      expect(result.current.reduceOnly).toBe(false);
      // No success navigation
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('submits the exact live size and omits USD for a max-slider full close', async () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      act(() => {
        result.current.sizeSlider.onDragEnd(
          result.current.sizeSlider.maximumValue,
        );
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder.mock.calls[0][0]).toMatchObject({
        size: '1',
        reduceOnly: true,
        isFullClose: true,
      });
      expect(mockExecuteOrder.mock.calls[0][0]).not.toHaveProperty('usdAmount');
    });

    it('keeps a focused max preview from becoming a full close', async () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      act(() => {
        result.current.sizeSlider.onValueChange(
          result.current.sizeSlider.maximumValue,
        );
        result.current.sizeInput.onFocus();
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder.mock.calls[0][0].isFullClose).not.toBe(true);
      expect(mockExecuteOrder.mock.calls[0][0].size).not.toBe('1');
    });

    it('submits a smaller interrupted reduce-only preview instead of a full close', async () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      const maximumAmount = result.current.sizeSlider.maximumValue;
      const smallerAmount = Math.floor(maximumAmount / 2);
      act(() => {
        result.current.sizeSlider.onDragEnd(maximumAmount);
        result.current.sizeSlider.onValueChange(smallerAmount);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockSetAmount).toHaveBeenLastCalledWith(smallerAmount.toString());
      expect(mockExecuteOrder).not.toHaveBeenCalled();

      mockOrderForm.amount = smallerAmount.toString();
      rerender({});

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params.size).not.toBe('1');
      expect(params.isFullClose).not.toBe(true);
      expect(params.usdAmount).toBe(smallerAmount.toString());
    });

    it('clears the size max override after a successful Reduce Only order', async () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();
      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      mockSetMaxPossibleAmountOverride.mockClear();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(result.current.reduceOnly).toBe(false);
      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(null);
    });

    it('flushes a pending slider preview before allowing submission', async () => {
      // Arrange
      const { result, rerender } = renderProForm();
      act(() => {
        result.current.sizeSlider.onValueChange(250);
      });

      // Act: the first tap commits the preview but must not race submission
      // against the canonical order-form state update.
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockSetAmount).toHaveBeenCalledWith('250');
      expect(mockExecuteOrder).not.toHaveBeenCalled();

      // Arrange: echo the context update and render the canonical amount.
      mockOrderForm.amount = '250';
      rerender({});

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder.mock.calls[0][0]).toMatchObject({
        usdAmount: '250',
      });
    });

    it('submits on the first tap when a pending slider preview is unchanged', async () => {
      // Arrange
      const { result } = renderProForm();
      act(() => {
        result.current.sizeSlider.onValueChange(100);
      });

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockSetAmount).not.toHaveBeenCalled();
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder.mock.calls[0][0]).toMatchObject({
        usdAmount: '100',
      });
    });

    it('blocks reduce-only submit when there is no open position', async () => {
      const { result } = renderProForm();
      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('blocks reduce-only submit when size exceeds the open position', async () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      mockOrderForm.amount = '100000';
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('blocks submit and shows a toast when validation is invalid', async () => {
      // Arrange
      mockValidation.isValid = false;
      mockValidation.errors = ['Bad order'];
      mockValidation.validateNow.mockResolvedValue({
        errors: ['Bad order'],
        warnings: [],
        fieldIssues: [],
        isValid: false,
      });
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith('Bad order');
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('shows a final trigger-limit field error without executing the order', async () => {
      // Arrange
      mockOrderForm.type = 'stop_limit';
      mockOrderForm.limitPrice = '89000';
      mockContextValue.triggerPrice = '91000';
      mockValidation.validateNow.mockResolvedValue({
        errors: [],
        warnings: [],
        fieldIssues: [
          {
            field: 'triggerPrice',
            issue: {
              code: 'wrong_side',
              family: 'stop',
              requiredSide: 'above',
            },
          },
        ],
        isValid: false,
      });
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        'Trigger price must be higher than mid price',
      );
    });

    it('keeps the CTA enabled without loading while validation is pending', () => {
      // Arrange
      mockValidation.isValidating = true;

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(false);
      expect(result.current.isPlaceOrderLoading).toBe(false);
    });

    it('runs current validation before executing a pending order', async () => {
      // Arrange
      mockValidation.isValidating = true;
      let resolveValidation:
        | ((value: {
            errors: string[];
            warnings: string[];
            fieldIssues: OrderFormFieldIssue[];
            isValid: boolean;
          }) => void)
        | undefined;
      mockValidation.validateNow.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveValidation = resolve;
        }),
      );
      const { result } = renderProForm();

      // Act
      await act(async () => {
        result.current.onPlaceOrderPress();
        await Promise.resolve();
      });

      // Assert
      expect(mockValidation.validateNow).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();

      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await Promise.resolve();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
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
      expect(playImpact).not.toHaveBeenCalled();
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
      expect(playImpact).not.toHaveBeenCalled();
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
      expect(playImpact).not.toHaveBeenCalled();
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
      // Arrange: valid reduce-only order with no TP/SL; controller returns failure
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      mockExecuteOrder.mockResolvedValueOnce({
        success: false,
        error: 'rejected',
      });
      const { result } = renderProForm();
      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      expect(mockClearPendingTradeConfiguration).not.toHaveBeenCalled();
      expect(mockUpdateOrderForm).not.toHaveBeenCalled();
      expect(result.current.reduceOnly).toBe(true);
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

    it('finalizes a trailing decimal separator from the limit price before submit', async () => {
      // Arrange: Place Order can fire before blur commits a state update.
      mockOrderForm.type = 'limit';
      mockOrderForm.limitPrice = '12.';
      const { result } = renderProForm();

      // Act
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      // Assert
      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params.price).toBe('12');
      expect(params.orderType).toBe('limit');
    });
  });

  describe('trigger orders', () => {
    it('preserves trigger inputs and blocks submission when the feature is disabled', async () => {
      mockOrderForm.type = 'stop_market';
      mockOrderForm.limitPrice = '90500';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm(false);

      expect(mockOrderForm.type).toBe('stop_market');
      expect(mockOrderForm.limitPrice).toBe('90500');
      expect(mockContextValue.triggerPrice).toBe('91000');
      expect(result.current.isPlaceOrderDisabled).toBe(false);
      expect(mockSetOrderType).not.toHaveBeenCalled();
      expect(mockSetLimitPrice).not.toHaveBeenCalled();
      expect(mockSetTriggerPrice).not.toHaveBeenCalled();

      act(() => {
        result.current.onOrderTypeSelect('stop_market');
      });

      expect(mockSetOrderType).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        'Triggered orders are temporarily unavailable. Select a market order.',
      );
    });

    it('submits triggerPrice and omits TP/SL for a stop-market order', async () => {
      mockOrderForm.type = 'stop_market';
      mockOrderForm.takeProfitPrice = '95000';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      const params = mockExecuteOrder.mock.calls[0][0] as {
        triggerPrice?: string;
        takeProfitPrice?: string;
        price?: string;
        orderType: string;
      };
      expect(params.orderType).toBe('stop_market');
      expect(params.triggerPrice).toBe('91000');
      expect(params).not.toHaveProperty('price');
      expect(params).not.toHaveProperty('takeProfitPrice');
    });

    it('validates trigger placement against mid when mark differs', async () => {
      mockLivePrice = '90000';
      mockLiveMarkPrice = '91000';
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '90500';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalled();
      expect(validationError).not.toHaveBeenCalled();
    });

    it('uses the 10% default slippage for trigger-market sizing and submission', async () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      expect(result.current.summary.slippage).toContain('Max: 10%');

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder.mock.calls[0][0]).toMatchObject({
        orderType: 'stop_market',
        maxSlippageBps: 1000,
      });
    });

    it('exposes persisted slippage for trigger-market settings', () => {
      mockMaxSlippageBps = 300;
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      expect(result.current.maxSlippageBps).toBe(300);
      expect(result.current.summary.slippage).toContain('Max: 10%');
    });

    it('tracks persisted slippage when trigger-market settings open', () => {
      mockMaxSlippageBps = 300;
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      act(() => {
        result.current.summary.onSlippagePress?.();
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIPPAGE_CONFIG_OPENED,
          [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_PCT]: 3,
          [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_SOURCE]:
            PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT,
        }),
      );
    });

    it('preserves an explicit trigger-market slippage setting', async () => {
      mockMaxSlippageBps = 300;
      mockMaxSlippageSource = 'user_configured';
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder.mock.calls[0][0].maxSlippageBps).toBe(300);
    });

    it('submits triggerPrice and limit price for a take-limit order', async () => {
      mockOrderForm.type = 'take_profit_limit';
      mockOrderForm.limitPrice = '89000';
      mockContextValue.triggerPrice = '88000';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      const params = mockExecuteOrder.mock.calls[0][0] as {
        triggerPrice?: string;
        price?: string;
        orderType: string;
      };
      expect(params.orderType).toBe('take_profit_limit');
      expect(params.triggerPrice).toBe('88000');
      expect(params.price).toBe('89000');
    });

    it('submits canonical venue prices after non-canonical trigger input', async () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91001.234';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder.mock.calls[0][0].triggerPrice).toBe('91001');
    });

    it('shows a blocking helper after the trigger price blurs on the wrong side of mid', () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '1000';
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        {
          field: 'triggerPrice',
          issue: {
            code: 'wrong_side',
            family: 'stop',
            requiredSide: 'above',
          },
        },
      ];
      const { result, rerender } = renderProForm();

      expect(result.current.priceCardMessage).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(false);

      act(() => {
        result.current.onTriggerPriceBlur();
      });
      rerender({});

      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Trigger price must be higher than mid price',
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('clears the helper once a valid trigger price is entered', () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '1000';
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        {
          field: 'triggerPrice',
          issue: {
            code: 'wrong_side',
            family: 'stop',
            requiredSide: 'above',
          },
        },
      ];
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.onTriggerPriceBlur();
      });
      mockContextValue.triggerPrice = '100000';
      mockValidation.isValid = true;
      mockValidation.fieldIssues = [];
      rerender({});

      expect(result.current.priceCardMessage).toBeUndefined();
    });

    it('shows the trigger error before the required limit error', () => {
      mockOrderForm.type = 'stop_limit';
      mockOrderForm.limitPrice = undefined;
      mockContextValue.triggerPrice = '1000';
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        {
          field: 'triggerPrice',
          issue: {
            code: 'wrong_side',
            family: 'stop',
            requiredSide: 'above',
          },
        },
        { field: 'limitPrice', issue: { code: 'required' } },
      ];
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.onTriggerPriceBlur();
        result.current.onLimitPriceBlur();
      });
      rerender({});

      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Trigger price must be higher than mid price',
      });
    });

    it.each(['stop_limit', 'take_profit_limit'] as const)(
      'defers a required limit error for %s until the limit price blurs',
      (orderType) => {
        mockOrderForm.type = orderType;
        mockOrderForm.limitPrice = undefined;
        mockContextValue.triggerPrice =
          orderType === 'stop_limit' ? '91000' : '89000';
        mockValidation.isValid = false;
        mockValidation.fieldIssues = [
          { field: 'limitPrice', issue: { code: 'required' } },
        ];
        const { result, rerender } = renderProForm();

        expect(result.current.priceCardMessage).toBeUndefined();
        expect(result.current.isPlaceOrderDisabled).toBe(false);

        act(() => {
          result.current.onLimitPriceBlur();
        });
        rerender({});

        expect(result.current.priceCardMessage).toEqual({
          severity: 'error',
          message: 'Please set a limit price for limit orders',
        });
        expect(result.current.isPlaceOrderDisabled).toBe(true);
      },
    );

    it('defers a required trigger error until the trigger price blurs', () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = undefined;
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        { field: 'triggerPrice', issue: { code: 'required' } },
      ];
      const { result, rerender } = renderProForm();

      expect(result.current.priceCardMessage).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(false);

      act(() => {
        result.current.onTriggerPriceBlur();
      });
      rerender({});

      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Please set a trigger price',
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('shows a required trigger error after a submit attempt', async () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = undefined;
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        { field: 'triggerPrice', issue: { code: 'required' } },
      ];
      const { result } = renderProForm();

      expect(result.current.priceCardMessage).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(false);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(validationError).toHaveBeenCalledWith(
        'Please set a trigger price',
      );
      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Please set a trigger price',
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it.each([
      {
        orderType: 'limit' as const,
        direction: 'long' as const,
        triggerPrice: '',
        limitPrice: '92000',
        expectedMessage:
          'Limit price is above current price. Your order may execute as a market order.',
      },
      {
        orderType: 'stop_limit' as const,
        direction: 'long' as const,
        triggerPrice: '91000',
        limitPrice: '92000',
        expectedMessage: undefined,
      },
      {
        orderType: 'take_profit_limit' as const,
        direction: 'short' as const,
        triggerPrice: '91000',
        limitPrice: '89000',
        expectedMessage: undefined,
      },
      {
        orderType: 'take_profit_limit' as const,
        direction: 'long' as const,
        triggerPrice: '89000',
        limitPrice: '89500',
        expectedMessage: undefined,
      },
    ])(
      'handles marketability warnings for $orderType orders',
      ({ orderType, direction, triggerPrice, limitPrice, expectedMessage }) => {
        mockOrderForm.type = orderType;
        mockOrderForm.direction = direction;
        mockOrderForm.limitPrice = limitPrice;
        mockContextValue.triggerPrice = triggerPrice;
        mockValidation.isValid = true;
        mockValidation.fieldIssues = [];
        const { result, rerender } = renderProForm();

        expect(result.current.priceCardMessage).toBeUndefined();
        expect(result.current.isPlaceOrderDisabled).toBe(false);

        act(() => {
          result.current.onLimitPriceBlur();
        });
        rerender({});

        if (expectedMessage) {
          expect(result.current.priceCardMessage).toEqual({
            severity: 'warning',
            message: expectedMessage,
          });
        } else {
          expect(result.current.priceCardMessage).toBeUndefined();
        }
        expect(result.current.isPlaceOrderDisabled).toBe(false);
      },
    );
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

    it('hides the slippage row for trigger-limit orders', () => {
      mockOrderForm.type = 'stop_limit';
      mockOrderForm.limitPrice = '80000';
      mockContextValue.triggerPrice = '91000';
      mockEstimatedSlippageBps = null;
      const { result } = renderProForm();

      expect(result.current.summary.slippage).toBeUndefined();
      expect(result.current.summary.onSlippagePress).toBeUndefined();
    });

    it('shows maximum slippage only for trigger-market orders', () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      mockEstimatedSlippageBps = 50;
      const { result } = renderProForm();

      expect(result.current.summary.slippage).toContain('Max:');
      expect(result.current.summary.slippage).not.toContain('Est:');
      expect(result.current.summary.onSlippagePress).toBeDefined();
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
    it.each(['', '0', 'not-a-number'])(
      'is disabled on mount for amount "%s"',
      (amount) => {
        // Arrange
        mockOrderForm.amount = amount;

        // Act
        const { result } = renderProForm();

        // Assert
        expect(result.current.isPlaceOrderDisabled).toBe(true);
        expect(result.current.notices).toEqual([]);
      },
    );

    it('shows loading only while order placement is in progress', () => {
      // Arrange
      mockIsPlacing = true;

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.isPlaceOrderLoading).toBe(true);
    });

    it('is disabled at the OI cap', () => {
      // Arrange
      mockIsAtCap = true;
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toContainEqual(
        expect.objectContaining({ id: 'oi-cap', variant: 'banner' }),
      );
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

    it('ignores TP/SL blockers while Reduce Only is on with a valid closing side', () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      mockOrderForm.takeProfitPrice = '85000';
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.isPlaceOrderDisabled).toBe(false);
    });

    it('disables Place Order while the reduce-only position is loading', () => {
      mockPositionStreamLoading = true;
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toContainEqual(
        expect.objectContaining({
          id: 'position-loading',
          variant: 'banner',
        }),
      );
    });
  });

  describe('reduceOnly toggle', () => {
    it('clears TP/SL state when Reduce Only turns on', () => {
      mockOrderForm.takeProfitPrice = '95000';
      mockOrderForm.stopLossPrice = '80000';
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(mockSetTakeProfitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetStopLossPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(null);
      expect(mockSetAmount).toHaveBeenCalledWith('0');
      expect(result.current.reduceOnly).toBe(true);
    });

    it('sets the size slider max to the open position notional when Reduce Only is on', () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      expect(result.current.sizeSlider.maximumValue).toBe(1000);

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.sizeSlider.maximumValue).toBe(90000);
      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(90000);
    });

    it('keeps the margin-based slider max and empty size when Reduce Only is on with no position', () => {
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.sizeSlider.maximumValue).toBe(1000);
      expect(result.current.sizeInput.value).toBe('');
    });

    it('keeps the margin-based slider max and empty size when Reduce Only is on with the wrong direction', () => {
      mockExistingPosition = {
        size: '1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.sizeSlider.maximumValue).toBe(1000);
      expect(result.current.sizeInput.value).toBe('');
      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(null);
    });

    it('does not commit slider amount when Reduce Only has a position error', () => {
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      mockSetAmount.mockClear();

      act(() => {
        result.current.sizeSlider.onValueChange(250);
        result.current.sizeSlider.onDragEnd(250);
      });

      expect(result.current.sizeInput.value).toBe('');
      expect(result.current.sizeSlider.value).toBe(250);
      expect(mockSetAmount).not.toHaveBeenCalled();
    });

    it('does not restore a focused size after Reduce Only enables with no position', () => {
      const { result } = renderProForm();

      act(() => {
        result.current.sizeInput.onFocus();
        result.current.onReduceOnlyChange(true);
        result.current.sizeInput.onBlur();
      });

      expect(result.current.sizeInput.value).toBe('');
      expect(mockSetAmount).toHaveBeenCalledWith('0');
      expect(mockSetAmount).not.toHaveBeenCalledWith('100');
    });

    it('does not clear typed size while the reduce-only position is loading', () => {
      mockPositionStreamLoading = true;
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(mockSetAmount).not.toHaveBeenCalledWith('0');
      expect(result.current.sizeInput.value).toBe('100');
      expect(result.current.sizeSlider.maximumValue).toBe(1000);
    });

    it('keeps typed size when a valid closing position arrives after Reduce Only load', () => {
      mockPositionStreamLoading = true;
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      mockPositionStreamLoading = false;
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      rerender({});

      expect(mockSetAmount).not.toHaveBeenCalledWith('0');
      expect(result.current.sizeInput.value).toBe('100');
      expect(result.current.sizeSlider.maximumValue).toBe(90000);
      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(90000);
    });

    it('uses the limit price for the Reduce Only slider max', () => {
      mockOrderForm.type = 'limit';
      mockOrderForm.limitPrice = '80000';
      mockExistingPosition = {
        size: '-0.5',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });

      expect(result.current.sizeSlider.maximumValue).toBe(40000);
    });

    it('restores the margin-based amount cap when Reduce Only turns off', () => {
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      mockSetMaxPossibleAmountOverride.mockClear();
      act(() => {
        result.current.onReduceOnlyChange(false);
      });

      expect(mockSetMaxPossibleAmountOverride).toHaveBeenCalledWith(null);
      expect(result.current.sizeSlider.maximumValue).toBe(1000);
    });

    it('does not clamp size to available margin when confirming leverage with Reduce Only on', () => {
      mockOrderForm.amount = '6000';
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const { result } = renderProForm();

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      mockSetAmount.mockClear();
      act(() => {
        result.current.onLeverageConfirm(10, 'slider');
      });

      expect(mockSetLeverage).toHaveBeenCalledWith(10);
      expect(mockSetAmount).not.toHaveBeenCalled();
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
      expect(playImpact).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
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
      expect(playImpact).not.toHaveBeenCalled();
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

    it('tracks leverage change with previous_leverage and not previousLeverage', () => {
      mockOrderForm.leverage = 5;
      const { result } = renderProForm();

      act(() => {
        result.current.onLeverageConfirm(10, 'slider');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_ANALYTICS_PREVIOUS_LEVERAGE]: 5,
          [PERPS_EVENT_PROPERTY.LEVERAGE_USED]: 10,
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.LEVERAGE_CHANGED,
        }),
      );
      const leverageChangeProps = mockTrack.mock.calls.find(
        (call) =>
          call[0] === MetaMetricsEvents.PERPS_UI_INTERACTION &&
          call[1]?.[PERPS_EVENT_PROPERTY.INTERACTION_TYPE] ===
            PERPS_EVENT_VALUE.INTERACTION_TYPE.LEVERAGE_CHANGED,
      )?.[1] as Record<string, unknown> | undefined;
      expect(leverageChangeProps).toBeDefined();
      expect(leverageChangeProps).not.toHaveProperty('previousLeverage');
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

    it('normalizes comma decimal input in the limit price', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceChange('0012,5');
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

    it('finalizes a trailing decimal separator from the limit price on blur', () => {
      // Arrange
      mockOrderForm.limitPrice = '12.';
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceBlur();
      });

      // Assert
      expect(mockCommitLimitPrice).toHaveBeenCalledWith('12');
    });

    it('does not update the limit price on blur when already finalized', () => {
      // Arrange
      mockOrderForm.limitPrice = '12.5';
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onLimitPriceBlur();
      });

      // Assert
      expect(mockSetLimitPrice).not.toHaveBeenCalled();
      expect(mockCommitLimitPrice).toHaveBeenCalledWith('12.5');
    });

    it('sets the limit price from the live mid', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.onUseMidPricePress();
      });

      // Assert
      expect(mockCommitLimitPrice).toHaveBeenCalled();
    });

    it('previews a slider USD amount before committing on drag end', () => {
      // Arrange
      const { result } = renderProForm();

      // Act
      act(() => {
        result.current.sizeSlider.onValueChange(500);
      });
      expect(mockSetAmount).not.toHaveBeenCalled();
      act(() => {
        result.current.sizeSlider.onDragEnd(500);
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
