import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_ERROR_CODES,
  SCALE_ORDER_COUNT,
  computeScalePriceLadder,
  formatHyperLiquidPrice,
  type PerpsMarketData,
  type PerpsProviderType,
  type PositionModifyPreviewResult,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_ANALYTICS_PREVIOUS_LEVERAGE } from '../../../../constants/perpsAnalytics';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { ChaseOrderRequestError } from '../../../../hooks/usePerpsChaseOrders';
import type { OrderFormFieldIssue } from '../../../../utils/triggerOrderValidation';
import { ImpactMoment, playImpact } from '../../../../../../../util/haptics';
import { usePerpsProOrderForm } from './usePerpsProOrderForm';

// ---------------------------------------------------------------------------
// Mock scaffolding
// ---------------------------------------------------------------------------
const mockTrack = jest.fn();
const mockLoggerError = jest.fn();
const mockInsufficientFundsMessage = strings(
  'perps.order.validation.insufficient_funds',
);
const mockShowToast = jest.fn();
const mockGetPerpsToastLabels = jest.fn(
  (primary: string, secondary?: string) => [
    { label: primary, isBold: true },
    ...(secondary
      ? [
          { label: '\n', isBold: false },
          { label: secondary, isBold: false },
        ]
      : []),
  ],
);
const mockNavigate = jest.fn();
const mockSetMaxSlippage = jest.fn();
const mockHandleAddFunds = jest.fn();
const mockCloseEligibilityModal = jest.fn();
const mockShowEligibilityModal = jest.fn();
const mockUpdatePositionTPSL = jest.fn().mockResolvedValue({ success: true });
const mockExecuteOrder = jest.fn().mockResolvedValue({ success: true });
const mockClearPendingTradeConfiguration = jest.fn();
let mockTotalFee = 5;
const mockUsePerpsOrderFees = jest.fn((_params: unknown) => ({
  totalFee: mockTotalFee,
  undiscountedTotalFee: 6,
  protocolFee: 4,
  metamaskFee: 1,
  metamaskFeeRate: 0.01,
  protocolFeeRate: 0.02,
  originalMetamaskFeeRate: 0.01,
  feeDiscountPercentage: 10,
  estimatedPoints: 100,
}));
const mockComplianceGate = jest.fn((action: () => Promise<unknown>) =>
  action(),
);
let mockComplianceActionDuringRender: (() => void) | undefined;

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
    | 'scale'
    | 'stop_market'
    | 'stop_limit'
    | 'take_profit_limit'
    | 'take_profit_market'
    | 'twap'
    | 'chase',
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
const mockResetPriceInputInteraction = jest.fn();
const mockSetOrderType = jest.fn();
const mockHandlePercentageAmount = jest.fn();
const mockUpdateOrderForm = jest.fn();
const mockSetMaxPossibleAmountOverride = jest.fn();
const mockGetChaseOrders = jest.fn();
let mockChaseOrders: { status: string }[] = [];
const mockUsePerpsChaseOrders = jest.fn(
  (_options: { isEnabled: boolean; enableDiscovery?: boolean }) => ({
    chaseOrders: mockChaseOrders,
    getChaseOrders: mockGetChaseOrders,
  }),
);
const mockRefreshChaseCapability = jest.fn().mockResolvedValue(null);

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
  resetPriceInputInteraction: mockResetPriceInputInteraction,
  setOrderType: mockSetOrderType,
  pendingReduceOnly: undefined as boolean | undefined,
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

let mockOrderValidationParams:
  | {
      marginRequired: string;
      spendableBalance: number;
      positionSize: string;
      originalUsdAmount?: string;
      providerId?: PerpsProviderType;
    }
  | undefined;
let mockValidateCalculatedMargin = false;

let mockExistingPosition: {
  symbol?: string;
  providerId?: PerpsProviderType;
  leverage?: { type?: string; value?: number };
  size?: string;
  marginUsed?: string;
  liquidationPrice?: string;
  entryPrice?: string;
  positionValue?: string;
} | null = null;

let mockPositionModifyPreview: PositionModifyPreviewResult = { status: 'none' };
let mockIsAwaitingPositionModifyPreview = false;

let mockIsAtCap = false;
let mockEstimatedSlippageBps: number | null = 50;
let mockMaxSlippageBps = 100;
let mockMaxSlippageSource = 'default';
let mockLivePrice = '90000';
let mockLiveMarkPrice = '90000';
let mockSizeDecimals = 3;
let mockSelectedAddress = '0xaccount-a';
let mockPerpsNetwork: 'mainnet' | 'testnet' = 'mainnet';

const submitted = jest.fn(() => ({ id: 'submitted' }));
const confirmed = jest.fn(() => ({ id: 'confirmed' }));
const creationFailed = jest.fn(() => ({ id: 'failed' }));
const limitSubmitted = jest.fn(() => ({ id: 'limit-submitted' }));
const limitConfirmed = jest.fn(() => ({ id: 'limit-confirmed' }));
const limitCreationFailed = jest.fn(() => ({ id: 'limit-failed' }));
const chaseSubmitted = jest.fn(() => ({ id: 'chase-submitted' }));
const chaseConfirmed = jest.fn(() => ({ id: 'chase-confirmed' }));
const chaseCreationFailed = jest.fn(() => ({ id: 'chase-failed' }));
const twapSubmitted = jest.fn(() => ({ id: 'twap-submitted' }));
const twapConfirmed = jest.fn(() => ({ id: 'twap-confirmed' }));
const twapCreationFailed = jest.fn(() => ({ id: 'twap-failed' }));
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
    limit: {
      submitted: limitSubmitted,
      confirmed: limitConfirmed,
      creationFailed: limitCreationFailed,
    },
    chase: {
      submitted: chaseSubmitted,
      confirmed: chaseConfirmed,
      creationFailed: chaseCreationFailed,
    },
    twap: {
      submitted: twapSubmitted,
      confirmed: twapConfirmed,
      creationFailed: twapCreationFailed,
    },
  },
  formValidation: { orderForm: { validationError, limitPriceRequired } },
  positionManagement: { tpsl: { updateTPSLError } },
};

jest.mock('../../../../contexts/PerpsOrderContext', () => ({
  usePerpsOrderContext: () => mockContextValue,
}));

jest.mock('../../../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: (...args: unknown[]) => mockLoggerError(...args) },
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
  getPerpsToastLabels: (primary: string, secondary?: string) =>
    mockGetPerpsToastLabels(primary, secondary),
  useHasExistingPosition: () => ({
    existingPosition: mockExistingPosition,
    isLoading: mockPositionStreamLoading,
  }),
  usePerpsLiquidationPrice: () => ({ liquidationPrice: '80000' }),
  usePerpsMarketData: () => ({
    marketData: mockMarketData
      ? { ...mockMarketData, szDecimals: mockSizeDecimals }
      : mockMarketData,
    isLoading: mockMarketDataLoading,
    error: mockMarketDataError,
  }),
  usePerpsNetwork: () => mockPerpsNetwork,
  usePerpsOrderExecution: (opts: typeof mockExecutionOptions) => {
    mockExecutionOptions = opts;
    return { placeOrder: mockExecuteOrder, isPlacing: mockIsPlacing };
  },
  usePerpsOrderFees: (params: unknown) => mockUsePerpsOrderFees(params),
  usePerpsOrderValidation: (params: typeof mockOrderValidationParams) => {
    mockOrderValidationParams = params;
    if (mockValidateCalculatedMargin && params) {
      const hasInsufficientBalance =
        Number(params.marginRequired) > params.spendableBalance;
      const errors = hasInsufficientBalance
        ? [mockInsufficientFundsMessage]
        : [];
      return {
        ...mockValidation,
        isValid: !hasInsufficientBalance,
        errors,
        validateNow: jest.fn().mockResolvedValue({
          errors,
          warnings: [],
          fieldIssues: [],
          isValid: !hasInsufficientBalance,
        }),
      };
    }
    return mockValidation;
  },
  usePerpsToasts: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: mockPerpsToastOptions,
  }),
  usePerpsPositionModifyPreview: () => ({
    preview: mockPositionModifyPreview,
    isCalculating: mockIsAwaitingPositionModifyPreview,
    isAwaitingFirstPreview: mockIsAwaitingPositionModifyPreview,
    error: null,
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
  useComplianceGate: () => {
    mockComplianceActionDuringRender?.();
    return {
      gate: mockComplianceGate,
      isBlocked: false,
      isComplianceEnabled: false,
      checkCompliance: jest.fn(),
    };
  },
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

jest.mock('../../../../hooks/usePerpsChaseOrders', () => {
  class MockChaseOrderRequestError extends Error {
    code: 'context_not_ready' | 'stale_request';

    constructor(code: 'context_not_ready' | 'stale_request') {
      super(code);
      this.code = code;
    }
  }

  return {
    ChaseOrderRequestError: MockChaseOrderRequestError,
    usePerpsChaseOrders: (options: {
      isEnabled: boolean;
      enableDiscovery?: boolean;
    }) => mockUsePerpsChaseOrders(options),
  };
});
jest.mock('../../../../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => 1,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: { isSelectedAccountSelector?: boolean }) =>
    selector.isSelectedAccountSelector ? mockSelectedAddress : false,
}));

jest.mock('../../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: Object.assign(() => undefined, {
    isSelectedAccountSelector: true,
  }),
}));

jest.mock('../../../../../../../util/haptics');

jest.mock('../../../../hooks/usePerpsSavePendingConfig', () => ({
  usePerpsSavePendingConfig: jest.fn(),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      clearPendingTradeConfiguration: (...args: unknown[]) =>
        mockClearPendingTradeConfiguration(...args),
    },
  },
}));

const market = {
  symbol: 'BTC',
  name: 'Bitcoin',
  providerId: 'hyperliquid',
} as PerpsMarketData;

interface RenderProFormScaleOptions {
  enabled?: boolean;
  pending?: boolean;
  checkSupport?: () => Promise<boolean>;
  providerId?: PerpsProviderType;
}

const renderProForm = (
  isTriggeredOrdersEnabled = true,
  isTwapEnabled = true,
  resolvedTwapProviderId: PerpsProviderType | undefined = 'hyperliquid',
  isTwapAvailabilityPending = false,
  scaleOptions: RenderProFormScaleOptions = {},
  chaseGate: {
    isEnabled?: boolean;
    isPending?: boolean;
    refresh?: () => Promise<PerpsProviderType | null>;
    providerId?: PerpsProviderType;
    isScreenFocused?: boolean;
  } = {},
) => {
  const checkTwapOrderSupport = jest.fn().mockResolvedValue(true);
  const checkScaleOrderSupport =
    scaleOptions.checkSupport ?? jest.fn().mockResolvedValue(true);
  const refreshChaseCapability =
    chaseGate.refresh ?? jest.fn().mockResolvedValue('hyperliquid');

  return renderHook(() =>
    usePerpsProOrderForm({
      market,
      isTriggeredOrdersEnabled,
      isTwapEnabled,
      isTwapAvailabilityPending,
      resolvedTwapProviderId,
      checkTwapOrderSupport,
      scaleProviderId: scaleOptions.providerId ?? 'hyperliquid',
      isScaleOrdersEnabled: scaleOptions.enabled ?? true,
      isScaleOrderSupportPending: scaleOptions.pending ?? false,
      checkScaleOrderSupport,
      isChaseEnabled: chaseGate.isEnabled ?? true,
      isChaseAvailabilityPending: chaseGate.isPending ?? false,
      refreshChaseCapability,
      chaseProviderId:
        chaseGate.isEnabled === false
          ? null
          : (chaseGate.providerId ?? 'hyperliquid'),
      isScreenFocused: chaseGate.isScreenFocused ?? true,
    }),
  );
};

interface MutableScaleProps {
  isScaleOrdersEnabled: boolean;
  isScaleOrderSupportPending: boolean;
  scaleProviderId: PerpsProviderType;
  checkScaleOrderSupport: () => Promise<boolean>;
}

const renderMutableScaleForm = (initialProps: MutableScaleProps) => {
  const checkTwapOrderSupport = jest.fn().mockResolvedValue(true);

  return renderHook(
    (props: MutableScaleProps) =>
      usePerpsProOrderForm({
        market,
        isTriggeredOrdersEnabled: true,
        isTwapEnabled: true,
        isTwapAvailabilityPending: false,
        resolvedTwapProviderId: 'hyperliquid',
        checkTwapOrderSupport,
        isChaseEnabled: false,
        isChaseAvailabilityPending: false,
        refreshChaseCapability: mockRefreshChaseCapability,
        chaseProviderId: null,
        ...props,
      }),
    { initialProps },
  );
};

describe('usePerpsProOrderForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionOptions = {};
    mockOrderForm.type = 'market';
    mockOrderForm.direction = 'long';
    mockOrderForm.amount = '100';
    mockOrderForm.leverage = 5;
    mockOrderForm.balancePercent = 10;
    mockOrderForm.limitPrice = undefined;
    mockContextValue.triggerPrice = undefined;
    mockContextValue.hasBlurredLimitPrice = false;
    mockContextValue.hasBlurredTriggerPrice = false;
    mockContextValue.pendingReduceOnly = undefined;
    mockContextValue.maxPossibleAmount = 1000;
    mockOrderForm.takeProfitPrice = undefined;
    mockOrderForm.stopLossPrice = undefined;
    mockContextValue.orderForm = mockOrderForm;
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
    mockPositionModifyPreview = { status: 'none' };
    mockIsAwaitingPositionModifyPreview = false;
    mockIsAtCap = false;
    mockEstimatedSlippageBps = 50;
    mockMaxSlippageBps = 100;
    mockMaxSlippageSource = 'default';
    mockLivePrice = '90000';
    mockLiveMarkPrice = '90000';
    mockTotalFee = 5;
    mockSizeDecimals = 3;
    mockSelectedAddress = '0xaccount-a';
    mockPerpsNetwork = 'mainnet';
    mockOrderValidationParams = undefined;
    mockValidateCalculatedMargin = false;
    mockContextValue.balanceForValidation = 500;
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
    mockComplianceActionDuringRender = undefined;
    mockCommitLimitPrice.mockImplementation((price?: string) => {
      mockOrderForm.limitPrice = price;
      mockContextValue.hasBlurredLimitPrice = true;
    });
    mockCommitTriggerPrice.mockImplementation((price?: string) => {
      mockContextValue.triggerPrice = price;
      mockContextValue.hasBlurredTriggerPrice = true;
    });
    mockResetPriceInputInteraction.mockImplementation(() => {
      mockContextValue.hasBlurredLimitPrice = false;
      mockContextValue.hasBlurredTriggerPrice = false;
    });
    mockUpdatePositionTPSL.mockResolvedValue({ success: true });
    mockExecuteOrder.mockResolvedValue({ success: true });
    mockChaseOrders = [];
    mockGetChaseOrders.mockResolvedValue([]);
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

    it('shows margin and liquidation before-and-after values from the controller preview', () => {
      mockExistingPosition = {
        size: '1',
        marginUsed: '1000',
        liquidationPrice: '48000',
        entryPrice: '50000',
        leverage: { type: 'isolated', value: 5 },
      };
      mockPositionModifyPreview = {
        status: 'open',
        kind: 'increase',
        current: {
          margin: { available: true, value: 1000 },
          liquidationPrice: { available: true, value: 48000 },
        },
        resulting: {
          direction: 'long',
          size: 1.002,
          entryPrice: 50010,
          leverage: 5,
          margin: { available: true, value: 1015 },
          liquidationPrice: { available: true, value: 47000 },
        },
      };

      const { result } = renderProForm();

      expect(result.current.summary.margin).toMatch(/→/);
      expect(result.current.summary.margin).toMatch(/\$1,000/);
      expect(result.current.summary.liquidationPrice).toMatch(/→/);
      expect(result.current.summary.liquidationPrice).toMatch(/\$48/);
    });

    it('keeps single-value summary when the controller returns no preview', () => {
      mockPositionModifyPreview = { status: 'none' };

      const { result } = renderProForm();

      expect(result.current.summary.margin).not.toMatch(/→/);
      expect(result.current.summary.liquidationPrice).not.toMatch(/→/);
    });

    it('keeps single-value summary for unsupported cross-margin previews', () => {
      mockExistingPosition = {
        size: '1',
        marginUsed: '1000',
        liquidationPrice: '48000',
        entryPrice: '50000',
        leverage: { type: 'cross', value: 5 },
      };
      mockPositionModifyPreview = {
        status: 'unsupported',
        reason: 'cross_margin',
      };

      const { result } = renderProForm();

      expect(result.current.summary.margin).not.toMatch(/→/);
      expect(result.current.summary.liquidationPrice).not.toMatch(/→/);
    });

    it('uses the controller fee result unchanged for a TWAP order', () => {
      mockOrderForm.type = 'twap';

      const { result } = renderProForm();

      expect(mockUsePerpsOrderFees).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'twap',
          symbol: 'BTC',
          providerId: 'hyperliquid',
        }),
      );
      expect(result.current.summary.fee).toBe(5);
      expect(result.current.summary.originalFee).toBe(6);
      expect(result.current.summary.feeDiscountPercentage).toBe(10);
      expect(result.current.feeMetamaskFeeRate).toBe(0.01);
      expect(result.current.feeProtocolFeeRate).toBe(0.02);
    });

    it('routes Scale fees and validation through the concrete provider', () => {
      mockOrderForm.type = 'scale';

      renderProForm(true, true, 'hyperliquid', false, {
        providerId: 'myx',
      });

      expect(mockUsePerpsOrderFees).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'myx',
        }),
      );
      expect(mockOrderValidationParams?.providerId).toBe('myx');
    });

    it('routes Chase fees through its placement provider', () => {
      mockOrderForm.type = 'chase';

      renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        {
          providerId: 'hyperliquid',
        },
      );

      expect(mockUsePerpsOrderFees).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'chase',
          providerId: 'hyperliquid',
        }),
      );
    });
  });

  describe('notices', () => {
    it.each([0, 1])(
      'blocks a %s-minute TWAP duration below the controller minimum',
      (minutes) => {
        mockOrderForm.type = 'twap';
        const { result } = renderProForm();

        act(() => {
          result.current.twap.onMinutesChange(String(minutes));
        });

        expect(
          result.current.notices.find(
            (notice) => notice.id === 'twap-duration',
          ),
        ).toEqual({
          id: 'twap-duration',
          variant: 'inline',
          message: strings(
            'perps.pro_order_form.twap.duration_range',
            PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
          ),
        });
        expect(result.current.isPlaceOrderDisabled).toBe(true);
      },
    );

    it('blocks TWAP totals below the controller-supported minimum', () => {
      mockOrderForm.type = 'twap';
      mockOrderForm.amount = '99';

      const { result } = renderProForm();

      expect(
        result.current.notices.find((notice) => notice.id === 'twap-min-size'),
      ).toEqual({
        id: 'twap-min-size',
        variant: 'inline',
        message: strings(
          'perps.pro_order_form.twap.minimum_size',
          PERPS_TWAP_UI_CONFIG.MinimumSizeI18nValues,
        ),
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('shows a required notice when the TWAP duration is empty', () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();

      act(() => {
        result.current.twap.onMinutesChange('');
      });

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(
        result.current.notices.find(
          (notice) => notice.id === 'twap-duration-required',
        ),
      ).toEqual({
        id: 'twap-duration-required',
        variant: 'inline',
        message: strings('perps.errors.orderValidation.twapDurationRequired'),
      });
    });

    it('keeps an empty TWAP size silent while disabling placement', () => {
      mockOrderForm.type = 'twap';
      mockOrderForm.amount = '';

      const { result } = renderProForm();

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(
        result.current.notices.find((notice) => notice.id === 'twap-min-size'),
      ).toBeUndefined();
    });

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

    it('blocks silently while market data is loading', () => {
      // Arrange
      mockMarketData = null;
      mockMarketDataLoading = true;

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.notices).toEqual([]);
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('explains why the order is blocked when the live price is unavailable', () => {
      // Arrange
      mockOrderForm.type = 'chase';
      mockLivePrice = '';

      // Act
      const { result } = renderProForm();
      act(() => result.current.onChaseMaxDistanceChange('1'));

      // Assert
      expect(result.current.notices).toContainEqual({
        id: 'price-unavailable',
        variant: 'banner',
        message: strings('perps.pro_order_form.price_unavailable'),
      });
      expect(
        result.current.notices.find(
          (notice) => notice.id === 'chase-max-distance',
        ),
      ).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.chaseReferencePrice).toBe(
        PERPS_CONSTANTS.FallbackPriceDisplay,
      );
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
    it('starts a new TWAP draft at the Figma default of 30 minutes', () => {
      mockOrderForm.type = 'twap';

      const { result } = renderProForm();

      expect(result.current.twap).toMatchObject({
        days: '',
        hours: '',
        minutes: '30',
      });
    });

    it('submits valid TWAP params with live mid price and Randomize', async () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();
      act(() => {
        result.current.twap.onHoursChange('1');
        result.current.twap.onMinutesChange('30');
        result.current.twap.onRandomizeChange(true);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'twap',
          currentPrice: 90000,
          priceAtCalculation: 90000,
          twapDuration: 90,
          twapRandomize: true,
          providerId: 'hyperliquid',
        }),
      );
      expect(mockExecuteOrder.mock.calls[0][0]).not.toHaveProperty('price');
      expect(mockExecuteOrder.mock.calls[0][0]).not.toHaveProperty(
        'maxSlippageBps',
      );
      expect(mockExecuteOrder.mock.calls[0][0].trackingData).not.toHaveProperty(
        'twapDuration',
      );
      expect(mockExecuteOrder.mock.calls[0][0].trackingData).not.toHaveProperty(
        'twapRandomize',
      );
      expect(twapSubmitted).toHaveBeenCalledWith(
        'long',
        expect.any(String),
        'BTC',
        90,
      );
    });

    it('resets the TWAP draft after accepted placement', async () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();
      act(() => {
        result.current.twap.onDaysChange('1');
        result.current.twap.onHoursChange('0');
        result.current.twap.onMinutesChange('0');
        result.current.twap.onRandomizeChange(true);
      });

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(result.current.twap).toMatchObject({
        days: '',
        hours: '',
        minutes: PERPS_TWAP_UI_CONFIG.DefaultMinutes,
        randomize: false,
      });
      expect(mockUpdateOrderForm).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '',
        }),
      );
    });

    it('shows TWAP-specific confirmation for accepted placement', () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();
      act(() => {
        result.current.twap.onMinutesChange('45');
      });

      act(() => {
        mockExecutionOptions.onSuccess?.();
      });

      expect(twapConfirmed).toHaveBeenCalledWith(
        'long',
        expect.any(String),
        'BTC',
        45,
      );
      expect(confirmed).not.toHaveBeenCalled();
    });

    it('shows TWAP-specific failure copy for rejected placement', () => {
      mockOrderForm.type = 'twap';
      renderProForm();

      act(() => {
        mockExecutionOptions.onError?.('TWAP rejected');
      });

      expect(twapCreationFailed).toHaveBeenCalledWith('TWAP rejected');
      expect(creationFailed).not.toHaveBeenCalled();
    });

    it('blocks TWAP placement after the feature gate is disabled', async () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm(true, false);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.twap_unavailable'),
      );
    });

    it('re-checks selected-route TWAP support immediately before placement', async () => {
      const checkTwapOrderSupport = jest.fn().mockResolvedValue(false);
      mockOrderForm.type = 'twap';
      const { result } = renderHook(() =>
        usePerpsProOrderForm({
          market,
          isTriggeredOrdersEnabled: true,
          isTwapEnabled: true,
          isTwapAvailabilityPending: false,
          resolvedTwapProviderId: 'hyperliquid',
          checkTwapOrderSupport,
          scaleProviderId: 'hyperliquid',
          isScaleOrdersEnabled: true,
          isScaleOrderSupportPending: false,
          checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
          isChaseEnabled: false,
          isChaseAvailabilityPending: false,
          refreshChaseCapability: mockRefreshChaseCapability,
          chaseProviderId: null,
        }),
      );

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(checkTwapOrderSupport).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.twap_unavailable'),
      );
    });

    it('re-checks TWAP rollout after an asynchronous compliance gate', async () => {
      let continuePlacement: (() => Promise<unknown>) | undefined;
      mockComplianceGate.mockImplementation((action) => {
        continuePlacement = action;
        return Promise.resolve();
      });
      mockOrderForm.type = 'twap';
      const { result, rerender } = renderHook(
        ({ isTwapEnabled }) =>
          usePerpsProOrderForm({
            market,
            isTriggeredOrdersEnabled: true,
            isTwapEnabled,
            isTwapAvailabilityPending: false,
            resolvedTwapProviderId: 'hyperliquid',
            checkTwapOrderSupport: jest.fn().mockResolvedValue(true),
            scaleProviderId: 'hyperliquid',
            isScaleOrdersEnabled: true,
            isScaleOrderSupportPending: false,
            checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
            isChaseEnabled: false,
            isChaseAvailabilityPending: false,
            refreshChaseCapability: mockRefreshChaseCapability,
            chaseProviderId: null,
          }),
        { initialProps: { isTwapEnabled: true } },
      );

      act(() => {
        result.current.onPlaceOrderPress();
      });
      rerender({ isTwapEnabled: false });
      await act(async () => {
        await continuePlacement?.();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.twap_unavailable'),
      );
    });

    it('blocks TWAP placement when its resolved route changes during validation', async () => {
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
      mockOrderForm.type = 'twap';
      const { result, rerender } = renderHook(
        ({ providerId }: { providerId: PerpsProviderType }) =>
          usePerpsProOrderForm({
            market,
            isTriggeredOrdersEnabled: true,
            isTwapEnabled: true,
            isTwapAvailabilityPending: false,
            resolvedTwapProviderId: providerId,
            checkTwapOrderSupport: jest.fn().mockResolvedValue(true),
            scaleProviderId: 'hyperliquid',
            isScaleOrdersEnabled: true,
            isScaleOrderSupportPending: false,
            checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
            isChaseEnabled: false,
            isChaseAvailabilityPending: false,
            refreshChaseCapability: mockRefreshChaseCapability,
            chaseProviderId: null,
          }),
        { initialProps: { providerId: 'hyperliquid' } },
      );
      await act(async () => {
        result.current.onPlaceOrderPress();
        await Promise.resolve();
      });

      rerender({ providerId: 'myx' });
      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await Promise.resolve();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.twap_unavailable'),
      );
    });

    it('resets a selected TWAP after rollout availability disappears', () => {
      mockOrderForm.type = 'twap';
      const { result, rerender } = renderHook(
        ({ isTwapEnabled }) =>
          usePerpsProOrderForm({
            market,
            isTriggeredOrdersEnabled: true,
            isTwapEnabled,
            isTwapAvailabilityPending: false,
            resolvedTwapProviderId: 'hyperliquid',
            checkTwapOrderSupport: jest.fn().mockResolvedValue(true),
            scaleProviderId: 'hyperliquid',
            isScaleOrdersEnabled: true,
            isScaleOrderSupportPending: false,
            checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
            isChaseEnabled: false,
            isChaseAvailabilityPending: false,
            refreshChaseCapability: mockRefreshChaseCapability,
            chaseProviderId: null,
          }),
        { initialProps: { isTwapEnabled: true } },
      );
      mockSetOrderType.mockClear();

      rerender({ isTwapEnabled: false });

      expect(mockSetOrderType).toHaveBeenCalledWith('market');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('clears the TWAP draft after rollout availability disappears', () => {
      mockOrderForm.type = 'twap';
      const { result, rerender } = renderHook(
        ({ isTwapEnabled }) =>
          usePerpsProOrderForm({
            market,
            isTriggeredOrdersEnabled: true,
            isTwapEnabled,
            isTwapAvailabilityPending: false,
            resolvedTwapProviderId: 'hyperliquid',
            checkTwapOrderSupport: jest.fn().mockResolvedValue(true),
            scaleProviderId: 'hyperliquid',
            isScaleOrdersEnabled: true,
            isScaleOrderSupportPending: false,
            checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
            isChaseEnabled: false,
            isChaseAvailabilityPending: false,
            refreshChaseCapability: mockRefreshChaseCapability,
            chaseProviderId: null,
          }),
        { initialProps: { isTwapEnabled: true } },
      );
      act(() => {
        result.current.twap.onDaysChange('1');
        result.current.twap.onHoursChange('2');
        result.current.twap.onMinutesChange('30');
        result.current.twap.onRandomizeChange(true);
      });

      rerender({ isTwapEnabled: false });

      expect(result.current.twap).toMatchObject({
        days: '',
        hours: '',
        minutes: PERPS_TWAP_UI_CONFIG.DefaultMinutes,
        randomize: false,
      });
    });

    it('preserves a selected TWAP draft through capability reinitialization', () => {
      mockOrderForm.type = 'twap';
      const { result, rerender } = renderHook(
        ({
          isTwapEnabled,
          isTwapAvailabilityPending,
          resolvedTwapProviderId,
        }) =>
          usePerpsProOrderForm({
            market,
            isTriggeredOrdersEnabled: true,
            isTwapEnabled,
            isTwapAvailabilityPending,
            resolvedTwapProviderId,
            checkTwapOrderSupport: jest.fn().mockResolvedValue(true),
            scaleProviderId: 'hyperliquid',
            isScaleOrdersEnabled: true,
            isScaleOrderSupportPending: false,
            checkScaleOrderSupport: jest.fn().mockResolvedValue(true),
            isChaseEnabled: false,
            isChaseAvailabilityPending: false,
            refreshChaseCapability: mockRefreshChaseCapability,
            chaseProviderId: null,
          }),
        {
          initialProps: {
            isTwapEnabled: true,
            isTwapAvailabilityPending: false,
            resolvedTwapProviderId: 'hyperliquid' as
              | PerpsProviderType
              | undefined,
          },
        },
      );
      act(() => {
        result.current.twap.onDaysChange('1');
        result.current.twap.onHoursChange('2');
        result.current.twap.onMinutesChange('30');
        result.current.twap.onRandomizeChange(true);
      });
      mockSetOrderType.mockClear();

      rerender({
        isTwapEnabled: false,
        isTwapAvailabilityPending: true,
        resolvedTwapProviderId: undefined,
      });

      expect(mockSetOrderType).not.toHaveBeenCalled();
      expect(result.current.twap).toMatchObject({
        days: '1',
        hours: '2',
        minutes: '30',
        randomize: true,
      });

      rerender({
        isTwapEnabled: true,
        isTwapAvailabilityPending: false,
        resolvedTwapProviderId: 'hyperliquid',
      });

      expect(mockSetOrderType).not.toHaveBeenCalled();
      expect(result.current.twap).toMatchObject({
        days: '1',
        hours: '2',
        minutes: '30',
        randomize: true,
      });
    });

    it('keeps ordinary placement on controller default routing', async () => {
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.not.objectContaining({ providerId: expect.anything() }),
      );
    });

    it('keeps a non-Chase fingerprint out of Chase analytics', async () => {
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
        }),
      );
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: PERPS_EVENT_VALUE.ORDER_TYPE.CHASE,
        }),
      );
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.REDUCE_ONLY]: expect.anything(),
        }),
      );
      expect(chaseSubmitted).not.toHaveBeenCalled();
    });

    it('does not show Chase feedback for a stale non-Chase fingerprint', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      mockContextValue.orderForm = { ...mockOrderForm, type: 'limit' };
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_account_changed'),
      );
    });

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

    it('keeps a pending termination in the visible Chase placement limit', () => {
      mockOrderForm.type = 'chase';
      mockChaseOrders = [
        ...Array.from({ length: 4 }, () => ({ status: 'active' })),
        { status: 'termination_pending' },
      ];

      const { result } = renderProForm();

      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('tracks each Chase limit banner episode once', () => {
      mockOrderForm.type = 'chase';
      mockChaseOrders = Array.from({ length: 5 }, () => ({
        status: 'active',
      }));
      const form = renderProForm();

      expect(mockTrack).toHaveBeenCalledTimes(1);
      form.rerender({});
      expect(mockTrack).toHaveBeenCalledTimes(1);
      mockChaseOrders = mockChaseOrders.slice(0, 4);
      form.rerender({});
      mockChaseOrders = [...mockChaseOrders, { status: 'termination_pending' }];
      form.rerender({});

      expect(mockTrack).toHaveBeenCalledTimes(2);
      expect(mockTrack).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          interaction_type: 'chase_concurrency_limit_hit',
          asset: 'BTC',
        }),
      );
    });

    it('blocks a Chase submit when refreshed active and pending sessions reach the venue limit', async () => {
      mockOrderForm.type = 'chase';
      mockGetChaseOrders.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, index) => ({
          handle: `chase-${index}`,
          status: index === 4 ? 'termination_pending' : 'active',
        })),
      );
      const form = renderProForm();

      await act(async () => {
        await form.result.current.onPlaceOrderPress();
      });

      expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          interaction_type: 'chase_concurrency_limit_hit',
          asset: 'BTC',
        }),
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      mockChaseOrders = Array.from({ length: 5 }, () => ({
        status: 'active',
      }));
      form.rerender({});
      const concurrencyEvents = mockTrack.mock.calls.filter(
        ([, properties]) =>
          properties.interaction_type === 'chase_concurrency_limit_hit',
      );
      expect(concurrencyEvents).toHaveLength(1);
    });

    it('tracks a controller Chase limit rejection during execution', async () => {
      mockOrderForm.type = 'chase';
      mockExecuteOrder.mockImplementationOnce(async () => {
        mockExecutionOptions.onError?.(
          PERPS_ERROR_CODES.ORDER_CHASE_LIMIT_REACHED,
        );
        return {
          success: false,
          error: PERPS_ERROR_CODES.ORDER_CHASE_LIMIT_REACHED,
        };
      });
      const { result } = renderProForm();

      await act(async () => result.current.onPlaceOrderPress());

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          interaction_type: 'chase_concurrency_limit_hit',
          asset: 'BTC',
        }),
      );
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('blocks Chase placement until session context reconnects', async () => {
      mockOrderForm.type = 'chase';
      mockGetChaseOrders
        .mockRejectedValueOnce(new Error('Chase order context is not ready'))
        .mockResolvedValueOnce([]);
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockGetChaseOrders).toHaveBeenCalledTimes(3);
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('abandons Chase when compliance resolves after fallback', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });

      mockContextValue.orderForm = { ...mockOrderForm, type: 'market' };
      form.rerender({});
      await act(async () => releaseCompliance?.());

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_route_changed'),
      );
    });

    it('locks Chase preflight against repeated taps and draft edits', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let firstSubmit: Promise<void> | undefined;

      act(() => {
        firstSubmit = form.result.current.onPlaceOrderPress();
      });
      expect(form.result.current.isPlaceOrderLoading).toBe(true);
      expect(form.result.current.isPlaceOrderDisabled).toBe(true);
      await act(async () => form.result.current.onPlaceOrderPress());
      act(() => form.result.current.onChaseMaxDistanceChange('25'));

      expect(mockComplianceGate).toHaveBeenCalledTimes(1);
      expect(form.result.current.chaseMaxDistance).toBe('');
      await act(async () => releaseCompliance?.());
      await act(async () => firstSubmit);
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(form.result.current.isPlaceOrderLoading).toBe(false);
    });

    it('releases Chase preflight lock after compliance failure', async () => {
      mockComplianceGate.mockRejectedValueOnce(new Error('compliance failed'));
      mockOrderForm.type = 'chase';
      const form = renderProForm();

      await act(async () => {
        await expect(form.result.current.onPlaceOrderPress()).rejects.toThrow(
          'compliance failed',
        );
      });

      expect(form.result.current.isPlaceOrderLoading).toBe(false);
      mockComplianceGate.mockImplementation((action) => action());
      await act(async () => form.result.current.onPlaceOrderPress());
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('abandons deferred Chase compliance after the symbol-keyed form unmounts', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });

      form.unmount();
      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockGetChaseOrders).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(mockTrack).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('keeps the Chase form active while disabling its blurred polling consumer', () => {
      mockOrderForm.type = 'chase';
      const chaseGate = { isScreenFocused: true };
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        chaseGate,
      );
      expect(mockUsePerpsChaseOrders).toHaveBeenLastCalledWith({
        isEnabled: true,
        enableDiscovery: false,
      });

      chaseGate.isScreenFocused = false;
      form.rerender({});

      expect(mockUsePerpsChaseOrders).toHaveBeenLastCalledWith({
        isEnabled: false,
        enableDiscovery: false,
      });
      expect(form.result.current.orderType).toBe('chase');
    });

    it('aborts Chase when the provider changes during compliance', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const chaseGate = { providerId: 'hyperliquid' as PerpsProviderType };
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        chaseGate,
      );
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      chaseGate.providerId = 'secondary-provider' as PerpsProviderType;
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_route_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('aborts Chase when the Perps network changes during compliance', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      mockPerpsNetwork = 'testnet';
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_route_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('aborts Chase when a price tick changes reviewed exposure during compliance', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      mockLivePrice = '45000';
      mockLiveMarkPrice = '45000';
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockGetChaseOrders).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('aborts Chase when effective token precision changes during compliance', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      mockSizeDecimals = 2;
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockGetChaseOrders).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('accepts formatting-equivalent prices during compliance', async () => {
      let releaseCompliance: (() => Promise<void>) | undefined;
      mockComplianceGate.mockImplementationOnce(
        (action: () => Promise<unknown>) =>
          new Promise((resolve) => {
            releaseCompliance = async () => resolve(await action());
          }),
      );
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      mockLivePrice = '90000.0';
      mockLiveMarkPrice = '90000.00';
      form.rerender({});

      await act(async () => {
        await releaseCompliance?.();
        await submitPromise;
      });

      expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(validationError).not.toHaveBeenCalled();
    });

    it('uses committed Chase refs during a render-phase compliance callback', async () => {
      let capturedAction: (() => Promise<unknown>) | undefined;
      mockComplianceGate.mockImplementationOnce((action) => {
        capturedAction = action;
        return Promise.resolve();
      });
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      act(() => {
        form.result.current.onPlaceOrderPress();
      });
      mockContextValue.orderForm = {
        ...mockOrderForm,
        type: 'market',
        amount: '200',
      };
      mockSelectedAddress = '0xaccount-b';
      let capturedResult: Promise<unknown> | undefined;
      mockComplianceActionDuringRender = () => {
        capturedResult = capturedAction?.();
        mockComplianceActionDuringRender = undefined;
      };

      form.rerender({});
      await act(async () => capturedResult);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('places Chase without an optional max distance', async () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      expect(result.current.chaseMaxDistance).toBe('');
      expect(result.current.isPlaceOrderDisabled).toBe(false);
      await act(async () => result.current.onPlaceOrderPress());

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.not.objectContaining({ chaseMaxDistanceBps: expect.anything() }),
      );
      expect(chaseSubmitted).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: PERPS_EVENT_VALUE.ORDER_TYPE.CHASE,
          [PERPS_EVENT_PROPERTY.REDUCE_ONLY]: false,
        }),
      );
    });

    it('refreshes Chase history after a successful terminal placement', async () => {
      const filledChase = {
        handle: 'chase-75dc4054-7c01-4bff-b31f-2a046c35ffdb',
        symbol: 'BTC',
        side: 'buy',
        originalSize: '0.3',
        remainingSize: '0',
        arrivalPrice: '90000',
        restingPrice: '90000',
        restingOrderId: null,
        distanceChasedBps: 0,
        repricings: 0,
        startedAt: 1_788_274_359_115,
        status: 'filled',
      };
      mockOrderForm.type = 'chase';
      mockGetChaseOrders
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([filledChase]);
      const { result } = renderProForm();

      await act(async () => result.current.onPlaceOrderPress());

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
      await expect(mockGetChaseOrders.mock.results[1].value).resolves.toEqual([
        filledChase,
      ]);
    });

    it('fails closed before controller placement when Chase is disabled', async () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { isEnabled: false },
      );

      await act(async () => result.current.onPlaceOrderPress());

      expect(mockGetChaseOrders).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_unavailable'),
      );
    });

    it('re-checks capability and fails closed before controller placement', async () => {
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue(null);
      const { result } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );

      await act(async () => result.current.onPlaceOrderPress());

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockGetChaseOrders).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_unavailable'),
      );
    });

    it('fails closed with feedback when the Chase session refresh fails', async () => {
      mockOrderForm.type = 'chase';
      mockGetChaseOrders.mockRejectedValueOnce(new Error('temporary failure'));
      const { result } = renderProForm();

      await act(async () => result.current.onPlaceOrderPress());

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_unavailable'),
      );
    });

    it('asks for route review when the Chase session refresh becomes stale', async () => {
      mockOrderForm.type = 'chase';
      mockGetChaseOrders.mockRejectedValueOnce(
        new ChaseOrderRequestError('stale_request'),
      );
      const { result } = renderProForm();

      await act(async () => result.current.onPlaceOrderPress());

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_route_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_unavailable'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('blocks a Chase distance-unit edit during capability refresh', async () => {
      let resolveRefresh:
        | ((providerId: 'hyperliquid' | null) => void)
        | undefined;
      const refresh = jest.fn(
        () =>
          new Promise<'hyperliquid' | null>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const { result } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );

      let submission: Promise<void> | undefined;
      act(() => {
        submission = result.current.onPlaceOrderPress();
      });
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        result.current.onChaseMaxDistanceUnitChange('percent');
      });
      expect(result.current.chaseMaxDistanceUnit).toBe('usd');
      await act(async () => {
        resolveRefresh?.('hyperliquid');
        await submission;
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('abandons Chase submit when the capability route disappears', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      const chaseGate: {
        refresh: () => Promise<'hyperliquid'>;
        providerId?: PerpsProviderType;
        isEnabled?: boolean;
      } = {
        refresh: jest.fn().mockResolvedValue('hyperliquid'),
        providerId: 'hyperliquid',
      };
      mockOrderForm.type = 'chase';
      const { result, rerender } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        chaseGate,
      );

      act(() => {
        result.current.onPlaceOrderPress();
      });
      await waitFor(() => {
        expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
      });
      chaseGate.isEnabled = false;
      rerender({});
      await act(async () => {
        resolveOrders?.([]);
        await Promise.resolve();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_route_changed'),
      );
    });

    it('abandons Chase submit when the visible draft changes during validation', async () => {
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
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const { result, rerender } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );

      act(() => {
        result.current.onPlaceOrderPress();
      });
      await waitFor(() => {
        expect(mockValidation.validateNow).toHaveBeenCalledTimes(1);
      });
      mockContextValue.orderForm = {
        ...mockOrderForm,
        direction: 'short',
        amount: '200',
      };
      rerender({});
      act(() => {
        result.current.onReduceOnlyChange(true);
        result.current.onChaseMaxDistanceChange('25');
      });

      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await Promise.resolve();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('abandons Chase submit when the selected account changes', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

      mockSelectedAddress = '0xaccount-b';
      form.rerender({});
      await act(async () => {
        resolveOrders?.([]);
        await submitPromise;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_account_changed'),
      );
      expect(validationError).not.toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('revalidates Chase when spendable balance drops during validation', async () => {
      const validResult = {
        errors: [],
        warnings: [],
        fieldIssues: [] as OrderFormFieldIssue[],
        isValid: true,
      };
      const balanceError = 'Balance dropped below required margin';
      let resolveFirstValidation:
        | ((value: typeof validResult) => void)
        | undefined;
      mockValidation.validateNow.mockReset();
      mockValidation.validateNow
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirstValidation = resolve;
          }),
        )
        .mockResolvedValueOnce({
          ...validResult,
          errors: [balanceError],
          isValid: false,
        });
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submission: Promise<void> | undefined;

      act(() => {
        submission = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() =>
        expect(mockValidation.validateNow).toHaveBeenCalledTimes(1),
      );
      mockContextValue.balanceForValidation = 0;
      form.rerender({});
      await act(async () => {
        resolveFirstValidation?.(validResult);
        await submission;
      });

      expect(mockValidation.validateNow).toHaveBeenCalledTimes(2);
      expect(validationError).toHaveBeenCalledWith(balanceError);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('revalidates Chase when an existing position becomes cross margin', async () => {
      const validResult = {
        errors: [],
        warnings: [],
        fieldIssues: [] as OrderFormFieldIssue[],
        isValid: true,
      };
      let resolveFirstValidation:
        | ((value: typeof validResult) => void)
        | undefined;
      mockValidation.validateNow.mockReset();
      mockValidation.validateNow
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirstValidation = resolve;
          }),
        )
        .mockResolvedValue(validResult);
      mockOrderForm.type = 'chase';
      const form = renderProForm();
      let submission: Promise<void> | undefined;

      act(() => {
        submission = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() =>
        expect(mockValidation.validateNow).toHaveBeenCalledTimes(1),
      );
      mockExistingPosition = {
        symbol: 'BTC',
        providerId: 'hyperliquid',
        size: '1',
        leverage: { type: 'cross', value: 5 },
      };
      form.rerender({});
      await act(async () => {
        resolveFirstValidation?.(validResult);
        await submission;
      });

      expect(mockValidation.validateNow).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
      });
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('revalidates Chase when reduce-only position loading starts', async () => {
      const validResult = {
        errors: [],
        warnings: [],
        fieldIssues: [] as OrderFormFieldIssue[],
        isValid: true,
      };
      let resolveFirstValidation:
        | ((value: typeof validResult) => void)
        | undefined;
      mockValidation.validateNow.mockReset();
      mockValidation.validateNow
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirstValidation = resolve;
          }),
        )
        .mockResolvedValue(validResult);
      mockOrderForm.type = 'chase';
      mockContextValue.pendingReduceOnly = true;
      mockExistingPosition = {
        symbol: 'BTC',
        providerId: 'hyperliquid',
        size: '-1',
        leverage: { type: 'isolated', value: 5 },
      };
      const form = renderProForm();
      let submission: Promise<void> | undefined;

      act(() => {
        submission = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() =>
        expect(mockValidation.validateNow).toHaveBeenCalledTimes(1),
      );
      mockPositionStreamLoading = true;
      form.rerender({});
      await act(async () => {
        resolveFirstValidation?.(validResult);
        await submission;
      });

      expect(mockValidation.validateNow).toHaveBeenCalledTimes(2);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('aborts when validation changes the reviewed Chase size', async () => {
      const validResult = {
        errors: [],
        warnings: [],
        fieldIssues: [] as OrderFormFieldIssue[],
        isValid: true,
      };
      let resolveFirstValidation:
        | ((value: typeof validResult) => void)
        | undefined;
      mockValidation.validateNow.mockReset();
      mockValidation.validateNow
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirstValidation = resolve;
          }),
        )
        .mockResolvedValue(validResult);
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      let submission: Promise<void> | undefined;

      act(() => {
        submission = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() =>
        expect(mockValidation.validateNow).toHaveBeenCalledTimes(1),
      );
      mockContextValue.balanceForValidation = 400;
      mockLivePrice = '45000';
      mockLiveMarkPrice = '45000';
      form.rerender({});
      await act(async () => {
        resolveFirstValidation?.(validResult);
        await submission;
      });
      expect(mockValidation.validateNow).toHaveBeenCalledTimes(2);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(chaseConfirmed).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('aborts when MAX-derived size changes during session refresh', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      act(() => {
        form.result.current.sizeSlider.onDragEnd(
          form.result.current.sizeSlider.maximumValue,
        );
      });
      const committedMaxAmount = String(mockSetAmount.mock.calls.at(-1)?.[0]);
      const maxOrderForm = {
        ...mockOrderForm,
        amount: committedMaxAmount,
      };
      mockContextValue.orderForm = maxOrderForm;
      form.rerender({});
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

      mockContextValue.maxPossibleAmount = 900;
      mockContextValue.orderForm = { ...maxOrderForm, amount: '900' };
      form.rerender({});
      await act(async () => {
        resolveOrders?.([]);
        await submitPromise;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('blocks an explicit Chase size edit during session refresh', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

      act(() => form.result.current.sizeInput.onChange('99'));
      expect(mockSetAmount).not.toHaveBeenCalled();
      await act(async () => {
        resolveOrders?.([]);
        await submitPromise;
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('blocks a Chase leverage edit during session refresh', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      let submitPromise: Promise<void> | undefined;
      act(() => {
        submitPromise = form.result.current.onPlaceOrderPress();
      });
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

      act(() => form.result.current.onLeverageConfirm(10, 'slider'));
      expect(mockSetLeverage).not.toHaveBeenCalled();
      await act(async () => {
        resolveOrders?.([]);
        await submitPromise;
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
    });

    it('aborts when effective price changes during session refresh', async () => {
      let resolveOrders: ((orders: never[]) => void) | undefined;
      mockGetChaseOrders.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrders = resolve;
          }),
      );
      mockOrderForm.type = 'chase';
      const refresh = jest.fn().mockResolvedValue('hyperliquid');
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { refresh },
      );
      act(() => form.result.current.onChaseMaxDistanceChange('90'));
      act(() => {
        form.result.current.onPlaceOrderPress();
      });
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

      mockLivePrice = '45000';
      form.rerender({});
      await act(async () => {
        resolveOrders?.([]);
        await Promise.resolve();
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.order.validation.chase_details_changed'),
      );
    });

    it('clears the Chase draft after capability resolves unsupported', () => {
      mockOrderForm.type = 'chase';
      const chaseGate = { isEnabled: true, isPending: false };
      const form = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        chaseGate,
      );
      act(() => form.result.current.onChaseMaxDistanceChange('25'));
      expect(form.result.current.chaseMaxDistance).toBe('25');

      chaseGate.isEnabled = false;
      form.rerender({});

      expect(mockSetOrderType).toHaveBeenCalledWith('market');
      expect(form.result.current.chaseMaxDistance).toBe('');
      expect(form.result.current.chaseMaxDistanceUnit).toBe('usd');
    });

    it('keeps a selected Chase draft while capability discovery is pending', () => {
      mockOrderForm.type = 'chase';

      const { result } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        {},
        { isEnabled: false, isPending: true },
      );

      expect(mockSetOrderType).not.toHaveBeenCalledWith('market');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
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
        await result.current.onPlaceOrderPress();
      });

      await waitFor(() => {
        expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      });
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

    it('blocks a pending trigger order when the live mid crosses the trigger', async () => {
      // Arrange
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
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
      const { result, rerender } = renderProForm();

      // Act
      await act(async () => {
        result.current.onPlaceOrderPress();
        await Promise.resolve();
      });

      mockLivePrice = '92000';
      rerender(undefined);

      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await Promise.resolve();
      });

      // Assert
      expect(validationError).toHaveBeenCalledWith(
        'Trigger price must be higher than mid price',
      );
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
      expect(submitted).not.toHaveBeenCalled();
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
      expect(chaseConfirmed).not.toHaveBeenCalled();
    });

    it('shows Chase confirmation when Chase starts', async () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      act(() => {
        mockExecutionOptions.onSuccess?.();
      });

      expect(chaseConfirmed).toHaveBeenCalled();
      expect(limitConfirmed).not.toHaveBeenCalled();
      expect(confirmed).not.toHaveBeenCalled();
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

  describe('scale orders', () => {
    it('normalizes Scale rungs through the controller precision contract', () => {
      expect(
        computeScalePriceLadder({
          minPrice: 100,
          maxPrice: 200,
          count: 3,
        }).map((price) => formatHyperLiquidPrice({ price, szDecimals: 3 })),
      ).toEqual(['100', '150', '200']);
      expect(
        computeScalePriceLadder({
          minPrice: 100.123456,
          maxPrice: 100.123457,
          count: 3,
        }).map((price) => formatHyperLiquidPrice({ price, szDecimals: 3 })),
      ).toEqual(['100.12', '100.12', '100.12']);
    });

    it('applies HyperLiquid precision for each asset size grid', () => {
      const ladder = computeScalePriceLadder({
        minPrice: 1.234567,
        maxPrice: 1.234568,
        count: 2,
      });
      const threeDecimalPrices = ladder.map((price) =>
        formatHyperLiquidPrice({ price, szDecimals: 3 }),
      );
      const fourDecimalPrices = ladder.map((price) =>
        formatHyperLiquidPrice({ price, szDecimals: 4 }),
      );

      expect(threeDecimalPrices).toEqual(['1.235', '1.235']);
      expect(fourDecimalPrices).toEqual(['1.23', '1.23']);
    });

    const configureScaleOrder = (
      result: ReturnType<typeof renderProForm>['result'],
    ) => {
      act(() => {
        result.current.scaleOrder.onStartPriceChange('100');
        result.current.scaleOrder.onEndPriceChange('200');
        result.current.scaleOrder.onTotalOrdersChange('3');
        result.current.scaleOrder.onSizeSkewChange('2.00');
      });
    };

    it('keeps Scale placement disabled for a MYX route', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        providerId: 'myx',
      });

      configureScaleOrder(result);

      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('starts with a blank Order count to match the default Scale form', () => {
      mockOrderForm.type = 'scale';

      const { result } = renderProForm();

      expect(result.current.scaleOrder.totalOrders).toBe('');
    });

    it('keeps the blank Scale default free of validation banners', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '';

      const { result } = renderProForm();

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).not.toContainEqual(
        expect.objectContaining({ id: 'scale' }),
      );
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
        }),
      );
    });

    it('restores Scale validation after switching order types', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm();
      const validationNotice = {
        id: 'scale',
        variant: 'banner',
        message: strings(
          'perps.pro_order_form.scale.validation.invalid_order_count',
          {
            minOrderCount: SCALE_ORDER_COUNT.min,
            maxOrderCount: SCALE_ORDER_COUNT.max,
          },
        ),
      };

      configureScaleOrder(result);
      act(() => {
        result.current.scaleOrder.onTotalOrdersChange(
          String(SCALE_ORDER_COUNT.min - 1),
        );
      });

      expect(result.current.notices).toContainEqual(validationNotice);

      mockOrderForm.type = 'limit';
      rerender({});

      expect(result.current.notices).not.toContainEqual(validationNotice);

      mockOrderForm.type = 'scale';
      rerender({});

      expect(result.current.notices).toContainEqual(validationNotice);
    });

    it('bounds ladder sizing work for an extreme accepted skew', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '999999999';
      mockSizeDecimals = 2;
      const { result } = renderProForm();
      act(() => {
        result.current.scaleOrder.onStartPriceChange('1');
        result.current.scaleOrder.onEndPriceChange('1000000');
        result.current.scaleOrder.onTotalOrdersChange('2');
      });

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('0.00000001');
      });

      expect(result.current.scaleOrder.rungs).toHaveLength(2);
      expect(
        result.current.scaleOrder.rungs.every((rung) => Number(rung.size) > 0),
      ).toBe(true);
      expect(result.current.isPlaceOrderDisabled).toBe(false);
    });

    it('reports unexpected controller ladder failures', () => {
      const error = new Error('ladder failed');
      const perpsController = jest.requireActual<
        typeof import('@metamask/perps-controller')
      >('@metamask/perps-controller');
      const splitScaleSizesSpy = jest
        .spyOn(perpsController, 'splitScaleSizes')
        .mockImplementationOnce(() => {
          throw error;
        });
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();

      configureScaleOrder(result);

      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'usePerpsProOrderForm',
            action: 'calculate_scale_ladder',
          }),
        }),
      );
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toContainEqual({
        id: 'scale',
        variant: 'banner',
        message: strings('perps.order.validation.error'),
      });
      splitScaleSizesSpy.mockRestore();
    });

    it.each([
      [
        PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID,
        strings('perps.pro_order_form.scale.validation.invalid_range'),
      ],
      [
        PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID,
        strings('perps.pro_order_form.scale.validation.invalid_order_count', {
          minOrderCount: SCALE_ORDER_COUNT.min,
          maxOrderCount: SCALE_ORDER_COUNT.max,
        }),
      ],
    ])(
      'normalizes controller ladder failure %s into Scale validation',
      (errorCode, message) => {
        const perpsController = jest.requireActual<
          typeof import('@metamask/perps-controller')
        >('@metamask/perps-controller');
        const splitScaleSizesSpy = jest
          .spyOn(perpsController, 'splitScaleSizes')
          .mockImplementationOnce(() => {
            throw new Error(errorCode);
          });
        mockOrderForm.type = 'scale';
        mockOrderForm.amount = '600';
        const { result } = renderProForm();

        configureScaleOrder(result);

        expect(mockLoggerError).not.toHaveBeenCalled();
        expect(result.current.notices).toContainEqual({
          id: 'scale',
          variant: 'banner',
          message,
        });
        splitScaleSizesSpy.mockRestore();
      },
    );

    it('uses controller-owned price formatting for Scale preview', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockSizeDecimals = 3;
      const hyperliquid = renderProForm();
      act(() => {
        hyperliquid.result.current.scaleOrder.onStartPriceChange('100.123456');
        hyperliquid.result.current.scaleOrder.onEndPriceChange('100.123457');
        hyperliquid.result.current.scaleOrder.onTotalOrdersChange('3');
      });

      expect(hyperliquid.result.current.scaleOrder.rungs).toEqual([]);
      hyperliquid.unmount();

      const myx = renderProForm(true, true, 'hyperliquid', false, {
        providerId: 'myx',
      });
      act(() => {
        myx.result.current.scaleOrder.onStartPriceChange('100.123456');
        myx.result.current.scaleOrder.onEndPriceChange('100.123457');
        myx.result.current.scaleOrder.onTotalOrdersChange('3');
      });

      expect(myx.result.current.scaleOrder.rungs).toEqual([]);
    });

    it('clears limit and trigger drafts when Scale is selected', () => {
      mockOrderForm.limitPrice = '90000';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm();

      act(() => {
        result.current.onOrderTypeSelect('scale');
      });

      expect(mockSetLimitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetTriggerPrice).toHaveBeenCalledWith(undefined);
    });

    it('clears hidden price and TP/SL drafts when Chase is selected', () => {
      mockOrderForm.limitPrice = '90000';
      mockContextValue.triggerPrice = '91000';
      mockOrderForm.takeProfitPrice = '95000';
      mockOrderForm.stopLossPrice = '85000';
      const { result } = renderProForm();

      act(() => {
        result.current.onOrderTypeSelect('chase');
      });

      expect(mockSetLimitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetTriggerPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetTakeProfitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetStopLossPrice).toHaveBeenCalledWith(undefined);
    });

    it('submits one controller Scale request with canonical strategy parameters', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'scale',
          scaleMinPrice: '100',
          scaleMaxPrice: '200',
          scaleNumOrders: 3,
          scaleSkew: 2,
          providerId: 'hyperliquid',
          reduceOnly: false,
        }),
      );
      const params = mockExecuteOrder.mock.calls[0][0];
      expect(params.size).toBe('3.725');
      expect(params).not.toHaveProperty('usdAmount');
      expect(params).not.toHaveProperty('timeInForce');
      expect(params).not.toHaveProperty('clientOrderId');
      expect(params).not.toHaveProperty('price');
    });

    it('rejects an unsupported Scale provider before placement', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        providerId: 'myx',
      });
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('keeps Scale USD sizing consistent when market and ladder prices differ', async () => {
      mockOrderForm.amount = '90000';
      mockLivePrice = '90000';
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.sizeInput.onToggleDenomination();
      });
      expect(result.current.sizeInput.value).toBe('1');
      expect(result.current.sizeInput.denomination).toEqual({
        unit: 'asset',
        symbol: 'BTC',
      });

      mockOrderForm.type = 'scale';
      rerender({});
      act(() => {
        result.current.scaleOrder.onStartPriceChange('50000');
        result.current.scaleOrder.onEndPriceChange('80000');
        result.current.scaleOrder.onTotalOrdersChange('3');
      });

      expect(result.current.sizeInput.value).toBe('90000');
      expect(result.current.sizeInput.denomination).toEqual({ unit: 'usd' });
      expect(result.current.sizeInput.canToggleDenomination).toBe(false);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'scale',
          size: '1.386',
          scaleMinPrice: '50000',
          scaleMaxPrice: '80000',
          scaleNumOrders: 3,
        }),
      );
    });

    it('resets Scale configuration after controller placement succeeds', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockUpdateOrderForm).toHaveBeenCalledWith({
        amount: '',
        direction: 'long',
        balancePercent: 0,
        limitPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      });
      expect(mockUpdateOrderForm.mock.calls[0][0]).not.toHaveProperty('type');
      expect(result.current.scaleOrder.startPrice).toBe('');
      expect(result.current.scaleOrder.endPrice).toBe('');
      expect(result.current.scaleOrder.totalOrders).toBe('');
      expect(result.current.scaleOrder.sizeSkew).toBe('1.00');
      expect(result.current.notices).not.toContainEqual(
        expect.objectContaining({ id: 'scale' }),
      );
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
        }),
      );

      mockOrderForm.type = 'limit';
      rerender({});
      mockOrderForm.type = 'scale';
      rerender({});

      expect(result.current.notices).not.toContainEqual(
        expect.objectContaining({ id: 'scale' }),
      );
    });

    it.each([
      ['full', ['101', '102', '103']],
      ['partial', ['101', '102']],
    ])(
      'clears limit and trigger drafts after %s Scale placement',
      async (_placement, childOrderIds) => {
        mockOrderForm.type = 'scale';
        mockOrderForm.amount = '600';
        mockOrderForm.limitPrice = '90000';
        mockContextValue.triggerPrice = '91000';
        mockExecuteOrder.mockResolvedValueOnce({
          success: true,
          childOrderIds,
          submittedSize: '2.222',
        });
        const { result } = renderProForm();
        configureScaleOrder(result);

        await act(async () => {
          await result.current.onPlaceOrderPress();
        });

        expect(mockSetLimitPrice).toHaveBeenCalledWith(undefined);
        expect(mockSetTriggerPrice).toHaveBeenCalledWith(undefined);
      },
    );

    it('shows localized Scale-specific copy while the ladder is submitted', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelOptions: [
            {
              label: strings('perps.pro_order_form.scale.orders_submitted'),
              isBold: true,
            },
            {
              label: '\n',
              isBold: false,
            },
            {
              label: strings('perps.pro_order_form.scale.submission_summary', {
                totalCount: 3,
                size: '3.725',
                assetSymbol: 'BTC',
              }),
              isBold: false,
            },
          ],
        }),
      );
    });

    it('shows localized Scale-specific copy when the full ladder is placed', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockResolvedValueOnce({
        success: true,
        childOrderIds: ['101', '102', '103'],
        submittedSize: '3.725',
        acceptedSize: '3.725',
        acceptedChildren: [
          { orderId: '101', state: 'resting' },
          { orderId: '102', state: 'resting' },
          { orderId: '103', state: 'resting' },
        ],
      });
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: strings('perps.pro_order_form.scale.orders_placed'),
              isBold: true,
            },
            {
              label: '\n',
              isBold: false,
            },
            {
              label: strings('perps.pro_order_form.scale.placement_summary', {
                submittedCount: 3,
                totalCount: 3,
                size: '3.725',
                assetSymbol: 'BTC',
              }),
              isBold: false,
            },
          ],
        }),
      );
    });

    it('shows localized Scale-specific copy for a partial controller result', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockResolvedValueOnce({
        success: true,
        childOrderIds: ['101'],
        submittedSize: '3.725',
        acceptedSize: '2.222',
        acceptedChildren: [
          { orderId: '101', state: 'resting' },
          { orderId: '102', state: 'filled' },
        ],
      });
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: strings(
                'perps.pro_order_form.scale.orders_partially_placed',
              ),
              isBold: true,
            },
            {
              label: '\n',
              isBold: false,
            },
            {
              label: strings(
                'perps.pro_order_form.scale.partial_placement_summary',
                {
                  submittedCount: 2,
                  totalCount: 3,
                  size: '2.222',
                  assetSymbol: 'BTC',
                },
              ),
              isBold: false,
            },
          ],
        }),
      );
    });

    it.each([
      {
        fallback: 'requested ladder for empty child arrays',
        orderResult: {
          success: true,
          childOrderIds: [],
          acceptedChildren: [],
          submittedSize: '3.725',
          acceptedSize: '3.725',
        },
        titleKey: 'perps.pro_order_form.scale.orders_placed',
        summaryKey: 'perps.pro_order_form.scale.placement_summary',
        acceptedCount: 3,
        acceptedSize: '3.725',
      },
      {
        fallback: 'legacy submitted size when accepted size is absent',
        orderResult: {
          success: true,
          childOrderIds: ['101', '102'],
          submittedSize: '2.222',
        },
        titleKey: 'perps.pro_order_form.scale.orders_partially_placed',
        summaryKey: 'perps.pro_order_form.scale.partial_placement_summary',
        acceptedCount: 2,
        acceptedSize: '2.222',
      },
    ] as const)(
      'uses $fallback in the confirmation copy',
      async ({
        orderResult,
        titleKey,
        summaryKey,
        acceptedCount,
        acceptedSize,
      }) => {
        mockOrderForm.type = 'scale';
        mockOrderForm.amount = '600';
        mockExecuteOrder.mockResolvedValueOnce(orderResult);
        const { result } = renderProForm();
        configureScaleOrder(result);

        await act(async () => {
          await result.current.onPlaceOrderPress();
        });

        expect(mockShowToast).toHaveBeenLastCalledWith(
          expect.objectContaining({
            labelOptions: [
              {
                label: strings(titleKey),
                isBold: true,
              },
              {
                label: '\n',
                isBold: false,
              },
              {
                label: strings(summaryKey, {
                  submittedCount: acceptedCount,
                  totalCount: 3,
                  size: acceptedSize,
                  assetSymbol: 'BTC',
                }),
                isBold: false,
              },
            ],
          }),
        );
      },
    );

    it('uses resting-order failure copy when Scale placement fails', () => {
      mockOrderForm.type = 'scale';
      renderProForm();

      act(() => {
        mockExecutionOptions.onError?.('Scale order rejected');
      });

      expect(limitCreationFailed).toHaveBeenCalledWith('Scale order rejected');
      expect(creationFailed).not.toHaveBeenCalled();
    });

    it('uses Scale failure copy after a Chase placement', async () => {
      mockOrderForm.type = 'chase';
      mockExecuteOrder
        .mockResolvedValueOnce({ success: true })
        .mockImplementationOnce(async () => {
          mockExecutionOptions.onError?.('Scale order rejected');
          return { success: false, error: 'Scale order rejected' };
        });
      const hook = renderProForm();
      await act(async () => {
        await hook.result.current.onPlaceOrderPress();
      });
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      hook.rerender({});
      configureScaleOrder(hook.result);

      await act(async () => {
        await hook.result.current.onPlaceOrderPress();
      });

      expect(limitCreationFailed).toHaveBeenCalledWith('Scale order rejected');
      expect(chaseCreationFailed).not.toHaveBeenCalled();
    });

    it('does not submit a duplicate Scale request while placement is pending', async () => {
      let resolveOrder:
        | ((value: { success: boolean; error?: string }) => void)
        | undefined;
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrder = resolve;
        }),
      );
      const { result } = renderProForm();
      configureScaleOrder(result);

      let firstSubmission: Promise<unknown> | undefined;
      await act(async () => {
        firstSubmission = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveOrder?.({ success: false, error: 'rejected' });
        await firstSubmission;
      });
    });

    it('resets Scale configuration after a partial controller result', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockResolvedValueOnce({
        success: true,
        childOrderIds: ['101', '102'],
        submittedSize: '2.222',
      });
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockUpdateOrderForm).toHaveBeenCalledWith({
        amount: '',
        direction: 'long',
        balancePercent: 0,
        limitPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      });
      expect(mockUpdateOrderForm.mock.calls[0][0]).not.toHaveProperty('type');
      expect(result.current.scaleOrder.startPrice).toBe('');
      expect(result.current.notices).not.toContainEqual(
        expect.objectContaining({ id: 'scale' }),
      );
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
        }),
      );
    });

    it('does not retry placed children after a partial Scale success', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockResolvedValueOnce({
        success: true,
        childOrderIds: ['101', '102'],
        submittedSize: '2.222',
      });
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
        await Promise.resolve();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(result.current.scaleOrder.startPrice).toBe('');
    });

    it('retains Scale configuration when the controller rejects the placement', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockExecuteOrder.mockResolvedValueOnce({
        success: false,
        error: 'Scale order rejected',
      });
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(mockUpdateOrderForm).not.toHaveBeenCalled();
      expect(result.current.scaleOrder.startPrice).toBe('100');
    });

    it('keeps the previous Scale order count when a fractional edit arrives', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();

      act(() => {
        result.current.scaleOrder.onTotalOrdersChange('3');
      });
      act(() => {
        result.current.scaleOrder.onTotalOrdersChange('3.5');
      });

      expect(result.current.scaleOrder.totalOrders).toBe('3');
    });

    it('blocks and tracks an out-of-range Scale order count', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      act(() => {
        result.current.scaleOrder.onTotalOrdersChange(
          String(SCALE_ORDER_COUNT.min - 1),
        );
      });

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toContainEqual({
        id: 'scale',
        variant: 'banner',
        message: strings(
          'perps.pro_order_form.scale.validation.invalid_order_count',
          {
            minOrderCount: SCALE_ORDER_COUNT.min,
            maxOrderCount: SCALE_ORDER_COUNT.max,
          },
        ),
      });
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]: 'invalid_order_count',
        }),
      );
    });

    it('rejects a ladder when a rung is below the controller minimum', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '20';
      const { result } = renderProForm();
      configureScaleOrder(result);

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'scale',
            message: strings(
              'perps.pro_order_form.scale.validation.minimum_lot',
            ),
          }),
        ]),
      );
    });

    it('asks for a Scale size before applying minimum-lot validation', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '';
      const { result } = renderProForm();
      configureScaleOrder(result);

      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'scale',
            message: strings(
              'perps.pro_order_form.scale.validation.size_required',
            ),
          }),
        ]),
      );
    });

    it('validates margin from the whole rounded Scale ladder notional', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      mockContextValue.balanceForValidation = 120;
      mockValidateCalculatedMargin = true;
      const { result } = renderProForm();
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(mockOrderValidationParams).toMatchObject({
        marginRequired: '120.02',
        spendableBalance: 120,
        positionSize: '3.725',
        originalUsdAmount: undefined,
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('blocks a Reduce Only Scale order when no position can be reduced', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(
        result.current.notices.find((notice) => notice.id === 'reduce-only')
          ?.message,
      ).toBe(strings('perps.order.validation.reduce_only_no_position'));
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('renders the controller-formatted Scale price ladder', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      const [first, middle, last] = result.current.scaleOrder.rungs;
      expect(first.price).toBe('100');
      expect(middle.price).toBe('150');
      expect(last.price).toBe('200');
    });

    it('weights an above-one Scale skew toward the end of the range', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      const [first, middle, last] = result.current.scaleOrder.rungs;
      expect(Number(first.size)).toBeLessThan(Number(middle.size));
      expect(Number(middle.size)).toBeLessThan(Number(last.size));
    });

    it('builds the per-rung Scale margin range', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      expect(result.current.scaleOrder.marginRange).toContain('→');
      expect(result.current.scaleOrder.marginRange).not.toBe('$ -');
    });

    it('weights a below-one Scale skew toward the start of the range', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('0.50');
      });

      const [first, middle, last] = result.current.scaleOrder.rungs;
      expect(Number(first.size)).toBeGreaterThan(Number(middle.size));
      expect(Number(middle.size)).toBeGreaterThan(Number(last.size));
    });

    it('keeps an exactly-one Scale skew evenly sized', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '599.85';
      const { result } = renderProForm();
      configureScaleOrder(result);

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('1.00');
      });

      const [first, middle, last] = result.current.scaleOrder.rungs;
      expect(first.size).toBe(middle.size);
      expect(middle.size).toBe(last.size);
    });

    it('rejects a third Scale skew decimal while typing', () => {
      mockOrderForm.type = 'scale';
      const { result } = renderProForm();

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('2.34');
        result.current.scaleOrder.onSizeSkewChange('2.345');
      });

      expect(result.current.scaleOrder.sizeSkew).toBe('2.34');
    });

    it('restores the default Scale skew when an empty draft blurs', () => {
      mockOrderForm.type = 'scale';
      const { result } = renderProForm();

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('');
      });
      act(() => {
        result.current.scaleOrder.onSizeSkewBlur();
      });

      expect(result.current.scaleOrder.sizeSkew).toBe('1.00');
    });

    it('preserves an invalid Scale skew on blur for validation', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm();
      configureScaleOrder(result);

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('0');
      });
      act(() => {
        result.current.scaleOrder.onSizeSkewBlur();
      });

      expect(result.current.scaleOrder.sizeSkew).toBe('0');
      expect(result.current.notices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'scale',
            message: strings(
              'perps.pro_order_form.scale.validation.invalid_skew',
            ),
          }),
        ]),
      );
    });

    it('tracks a Scale configuration interaction', () => {
      mockOrderForm.type = 'scale';
      const { result } = renderProForm();

      act(() => {
        result.current.scaleOrder.onSizeSkewChange('2.34');
      });
      act(() => {
        result.current.scaleOrder.onSizeSkewBlur();
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_CONFIG_CHANGED,
          [PERPS_EVENT_PROPERTY.SETTING_TYPE]:
            PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_SIZE_SKEW,
          [PERPS_EVENT_PROPERTY.SCALE_SKEW]: 2.34,
        }),
      );
    });

    it('opens the Size skew tooltip', () => {
      mockOrderForm.type = 'scale';
      const { result } = renderProForm();

      act(() => {
        result.current.scaleOrder.onSizeSkewInfoPress();
      });

      expect(result.current.selectedTooltip).toBe('size_skew');
    });

    it('preserves a supported Scale draft while capability refresh is pending', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        enabled: true,
        pending: true,
      });
      configureScaleOrder(result);

      expect(mockSetOrderType).not.toHaveBeenCalledWith('market');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('preserves an initial persisted Scale draft while capability support is pending', async () => {
      const checkScaleOrderSupport = jest.fn().mockResolvedValue(false);
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        enabled: false,
        pending: true,
        checkSupport: checkScaleOrderSupport,
      });
      configureScaleOrder(result);

      expect(mockSetOrderType).not.toHaveBeenCalledWith('market');
      expect(result.current.isPlaceOrderDisabled).toBe(true);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(checkScaleOrderSupport).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('resets a selected Scale draft after capability resolves unsupported', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';

      renderProForm(true, true, 'hyperliquid', false, { enabled: false });

      expect(mockSetOrderType).toHaveBeenCalledWith('market');
    });

    it('blocks Scale selection when the remote flag is disabled', () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        enabled: false,
      });

      act(() => {
        result.current.onOrderTypeSelect('scale');
      });

      expect(mockSetOrderType).toHaveBeenCalledWith('market');
      expect(mockSetOrderType).not.toHaveBeenCalledWith('scale');
    });

    it('blocks Scale placement when the remote flag is disabled', async () => {
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        enabled: false,
      });
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(validationError).toHaveBeenCalledWith(
        strings('perps.pro_order_form.scale.validation.unavailable'),
      );
      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('re-checks selected-route Scale support immediately before placement', async () => {
      const checkScaleOrderSupport = jest.fn().mockResolvedValue(false);
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        checkSupport: checkScaleOrderSupport,
      });
      configureScaleOrder(result);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(checkScaleOrderSupport).toHaveBeenCalledTimes(1);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'validationError' }),
      );
    });

    it('restarts Scale validation when the live position changes during validation', async () => {
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
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm();
      configureScaleOrder(result);
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      mockExistingPosition = {
        size: '-1',
        leverage: { type: 'cross', value: 5 },
      };
      rerender({});

      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await placement;
      });

      expect(mockValidation.validateNow).toHaveBeenCalledTimes(3);
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
      });
    });

    it('ignores live mid-price ticks during Scale validation', async () => {
      const validResult = {
        errors: [],
        warnings: [],
        fieldIssues: [] as OrderFormFieldIssue[],
        isValid: true,
      };
      let resolveFirst: ((value: typeof validResult) => void) | undefined;
      let resolveSecond: ((value: typeof validResult) => void) | undefined;
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm();
      configureScaleOrder(result);
      mockValidation.validateNow.mockReset();
      mockValidation.validateNow
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
        );
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      mockLivePrice = '90001';
      rerender({});
      await act(async () => {
        resolveFirst?.(validResult);
        await Promise.resolve();
      });
      mockLivePrice = '90002';
      rerender({});
      await act(async () => {
        resolveSecond?.(validResult);
        await placement;
      });

      expect(mockValidation.validateNow).toHaveBeenCalledTimes(2);
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);
      expect(validationError).not.toHaveBeenCalled();
    });

    it('uses fresh reduce-only position state after the Scale capability gap', async () => {
      let resolveSupport: ((isSupported: boolean) => void) | undefined;
      const checkScaleOrderSupport = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveSupport = resolve;
          }),
      );
      mockExistingPosition = {
        size: '-10',
        leverage: { type: 'isolated', value: 5 },
      };
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        { checkSupport: checkScaleOrderSupport },
      );
      configureScaleOrder(result);
      act(() => {
        result.current.onReduceOnlyChange(true);
      });
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      mockExistingPosition = {
        size: '10',
        leverage: { type: 'isolated', value: 5 },
      };
      rerender({});

      await act(async () => {
        resolveSupport?.(true);
        await placement;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
    });

    it('uses fresh sizing and fee inputs after the Scale capability gap', async () => {
      let resolveSupport: ((isSupported: boolean) => void) | undefined;
      const checkScaleOrderSupport = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveSupport = resolve;
          }),
      );
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        { checkSupport: checkScaleOrderSupport },
      );
      configureScaleOrder(result);
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      mockSizeDecimals = 2;
      mockTotalFee = 9;
      rerender({});

      await act(async () => {
        resolveSupport?.(true);
        await placement;
      });

      const submittedParams = mockExecuteOrder.mock.calls[0][0];
      expect(submittedParams.size).not.toBe('3.725');
      expect(submittedParams.trackingData.totalFee).toBe(9);
    });

    it('uses a fresh Scale ladder after the capability gap', async () => {
      let resolveSupport: ((isSupported: boolean) => void) | undefined;
      const checkScaleOrderSupport = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveSupport = resolve;
          }),
      );
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm(
        true,
        true,
        'hyperliquid',
        false,
        { checkSupport: checkScaleOrderSupport },
      );
      configureScaleOrder(result);
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      mockOrderForm.amount = '20';
      rerender({});

      await act(async () => {
        resolveSupport?.(true);
        await placement;
      });

      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.pro_order_form.scale.validation.minimum_lot'),
      );
    });

    it('locks retained Scale callbacks before deferred compliance completes', async () => {
      let continueCompliance: (() => Promise<void>) | undefined;
      let resolveCompliance: (() => void) | undefined;
      mockComplianceGate.mockImplementation(
        (action: () => Promise<unknown>) =>
          new Promise<void>((resolve) => {
            resolveCompliance = resolve;
            continueCompliance = async () => {
              await action();
              resolveCompliance?.();
            };
          }),
      );
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderProForm();
      configureScaleOrder(result);
      const staleScaleOrder = result.current.scaleOrder;
      const staleSizeInput = result.current.sizeInput;
      const staleOnDirectionChange = result.current.onDirectionChange;
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });

      expect(result.current.isPlaceOrderLoading).toBe(true);
      mockSetAmount.mockClear();
      mockSetDirection.mockClear();
      act(() => {
        staleScaleOrder.onStartPriceChange('999');
        staleSizeInput.onChange('900');
        staleOnDirectionChange('short');
      });

      expect(result.current.scaleOrder.startPrice).toBe('100');
      expect(result.current.sizeInput.value).toBe('600');
      expect(result.current.direction).toBe('long');
      expect(mockSetAmount).not.toHaveBeenCalled();
      expect(mockSetDirection).not.toHaveBeenCalled();
      mockTotalFee = 9;
      rerender({});

      await act(async () => {
        await continueCompliance?.();
        await placement;
      });

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'scale',
          isBuy: true,
          size: '3.725',
          scaleMinPrice: '100',
          trackingData: expect.objectContaining({ totalFee: 9 }),
        }),
      );
    });

    it('blocks Scale placement when its flag turns off during validation', async () => {
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
      const checkScaleOrderSupport = jest.fn().mockResolvedValue(true);
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderMutableScaleForm({
        isScaleOrdersEnabled: true,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'hyperliquid',
        checkScaleOrderSupport,
      });
      configureScaleOrder(result);
      mockSetOrderType.mockClear();
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      rerender({
        isScaleOrdersEnabled: false,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'hyperliquid',
        checkScaleOrderSupport,
      });

      expect(result.current.isPlaceOrderLoading).toBe(true);
      expect(mockSetOrderType).not.toHaveBeenCalled();

      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await placement;
      });

      expect(checkScaleOrderSupport).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(mockSetOrderType).toHaveBeenCalledWith('market');
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.pro_order_form.scale.validation.unavailable'),
      );
    });

    it('blocks Scale placement when its provider changes during validation', async () => {
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
      const checkScaleOrderSupport = jest.fn().mockResolvedValue(true);
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderMutableScaleForm({
        isScaleOrdersEnabled: true,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'hyperliquid',
        checkScaleOrderSupport,
      });
      configureScaleOrder(result);
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });
      rerender({
        isScaleOrdersEnabled: true,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'myx',
        checkScaleOrderSupport,
      });
      await act(async () => {
        resolveValidation?.({
          errors: [],
          warnings: [],
          fieldIssues: [],
          isValid: true,
        });
        await placement;
      });

      expect(checkScaleOrderSupport).not.toHaveBeenCalled();
      expect(mockExecuteOrder).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        strings('perps.pro_order_form.scale.validation.unavailable'),
      );
    });

    it('keeps Scale locked when capability support is lost during placement', async () => {
      let resolveOrder:
        | ((value: { success: boolean; childOrderIds: string[] }) => void)
        | undefined;
      mockExecuteOrder.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrder = resolve;
        }),
      );
      const checkScaleOrderSupport = jest.fn().mockResolvedValue(true);
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result, rerender } = renderMutableScaleForm({
        isScaleOrdersEnabled: true,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'hyperliquid',
        checkScaleOrderSupport,
      });
      configureScaleOrder(result);
      const staleScaleOrder = result.current.scaleOrder;
      const staleSizeInput = result.current.sizeInput;
      mockSetOrderType.mockClear();
      mockUpdateOrderForm.mockClear();
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockExecuteOrder).toHaveBeenCalledTimes(1);

      rerender({
        isScaleOrdersEnabled: false,
        isScaleOrderSupportPending: false,
        scaleProviderId: 'hyperliquid',
        checkScaleOrderSupport,
      });
      mockSetAmount.mockClear();
      act(() => {
        staleScaleOrder.onEndPriceChange('999');
        staleSizeInput.onChange('900');
      });

      expect(result.current.isPlaceOrderLoading).toBe(true);
      expect(result.current.scaleOrder.endPrice).toBe('200');
      expect(result.current.sizeInput.value).toBe('600');
      expect(mockSetAmount).not.toHaveBeenCalled();
      expect(mockSetOrderType).not.toHaveBeenCalled();
      expect(mockUpdateOrderForm).not.toHaveBeenCalled();

      await act(async () => {
        resolveOrder?.({ success: true, childOrderIds: ['1', '2', '3'] });
        await placement;
      });

      expect(result.current.isPlaceOrderLoading).toBe(false);
      expect(mockSetOrderType).toHaveBeenCalledWith('market');
    });

    it('rejects stale Scale mutations during the capability recheck and submits the original snapshot', async () => {
      let resolveSupport: ((isSupported: boolean) => void) | undefined;
      const checkScaleOrderSupport = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveSupport = resolve;
          }),
      );
      mockOrderForm.type = 'scale';
      mockOrderForm.amount = '600';
      const { result } = renderProForm(true, true, 'hyperliquid', false, {
        checkSupport: checkScaleOrderSupport,
      });
      configureScaleOrder(result);

      const staleScaleOrder = result.current.scaleOrder;
      const staleSizeInput = result.current.sizeInput;
      const staleSizeSlider = result.current.sizeSlider;
      const staleOnDirectionChange = result.current.onDirectionChange;
      const staleOnLeveragePress = result.current.onLeveragePress;
      const staleOnLeverageConfirm = result.current.onLeverageConfirm;
      const staleOnOrderTypeButtonPress = result.current.onOrderTypeButtonPress;
      const staleOnOrderTypeSelect = result.current.onOrderTypeSelect;
      const staleOnReduceOnlyChange = result.current.onReduceOnlyChange;
      let placement: Promise<unknown> | undefined;

      await act(async () => {
        placement = Promise.resolve(result.current.onPlaceOrderPress());
        await Promise.resolve();
      });

      expect(checkScaleOrderSupport).toHaveBeenCalledTimes(1);
      expect(result.current.isPlaceOrderLoading).toBe(true);
      mockSetAmount.mockClear();
      mockSetDirection.mockClear();
      mockSetLeverage.mockClear();
      mockSetOrderType.mockClear();

      act(() => {
        staleScaleOrder.onStartPriceChange('999');
        staleScaleOrder.onStartPriceBlur();
        staleScaleOrder.onEndPriceChange('1000');
        staleScaleOrder.onEndPriceBlur();
        staleScaleOrder.onTotalOrdersChange('20');
        staleScaleOrder.onTotalOrdersBlur();
        staleScaleOrder.onSizeSkewChange('9.00');
        staleScaleOrder.onSizeSkewBlur();
        staleScaleOrder.onSizeSkewInfoPress();
        staleSizeInput.onChange('900');
        staleSizeInput.onFocus();
        staleSizeInput.onBlur();
        staleSizeInput.onToggleDenomination();
        staleSizeSlider.onValueChange(900);
        staleSizeSlider.onDragEnd(900);
        staleSizeSlider.onDragCancel();
        staleOnDirectionChange('short');
        staleOnLeveragePress();
        staleOnLeverageConfirm(9);
        staleOnOrderTypeButtonPress();
        staleOnOrderTypeSelect('market');
        staleOnReduceOnlyChange(true);
      });

      expect(result.current.scaleOrder).toMatchObject({
        startPrice: '100',
        endPrice: '200',
        totalOrders: '3',
        sizeSkew: '2.00',
      });
      expect(result.current.sizeInput.value).toBe('600');
      expect(result.current.sizeInput.denomination).toEqual({ unit: 'usd' });
      expect(result.current.direction).toBe('long');
      expect(result.current.leverage).toBe(5);
      expect(result.current.orderType).toBe('scale');
      expect(result.current.reduceOnly).toBe(false);
      expect(result.current.isLeverageVisible).toBe(false);
      expect(result.current.isOrderTypeVisible).toBe(false);
      expect(result.current.selectedTooltip).toBeNull();
      expect(mockSetAmount).not.toHaveBeenCalled();
      expect(mockSetDirection).not.toHaveBeenCalled();
      expect(mockSetLeverage).not.toHaveBeenCalled();
      expect(mockSetOrderType).not.toHaveBeenCalled();

      await act(async () => {
        resolveSupport?.(true);
        await placement;
      });

      expect(mockExecuteOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'scale',
          isBuy: true,
          leverage: 5,
          size: '3.725',
          scaleMinPrice: '100',
          scaleMaxPrice: '200',
          scaleNumOrders: 3,
          scaleSkew: 2,
        }),
      );
    });
  });

  describe('trigger orders', () => {
    it('explains and blocks a preserved trigger order when the feature is disabled', async () => {
      mockOrderForm.type = 'stop_market';
      mockOrderForm.limitPrice = '90500';
      mockContextValue.triggerPrice = '91000';
      const { result } = renderProForm(false);

      expect(mockOrderForm.type).toBe('stop_market');
      expect(mockOrderForm.limitPrice).toBe('90500');
      expect(mockContextValue.triggerPrice).toBe('91000');
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toContainEqual({
        id: 'trigger-orders-unavailable',
        variant: 'banner',
        message: strings('perps.order.validation.trigger_orders_unavailable'),
      });
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

    it.each([
      {
        orderType: 'stop_market',
        direction: 'long',
        triggerPrice: '80000',
        family: 'stop',
        requiredSide: 'above',
        message: 'Trigger price must be higher than mid price',
      },
      {
        orderType: 'stop_market',
        direction: 'short',
        triggerPrice: '100000',
        family: 'stop',
        requiredSide: 'below',
        message: 'Trigger price must be lower than mid price',
      },
      {
        orderType: 'stop_limit',
        direction: 'long',
        triggerPrice: '80000',
        family: 'stop',
        requiredSide: 'above',
        message: 'Trigger price must be higher than mid price',
      },
      {
        orderType: 'stop_limit',
        direction: 'short',
        triggerPrice: '100000',
        family: 'stop',
        requiredSide: 'below',
        message: 'Trigger price must be lower than mid price',
      },
      {
        orderType: 'take_profit_market',
        direction: 'long',
        triggerPrice: '100000',
        family: 'take_profit',
        requiredSide: 'below',
        message: 'Trigger price must be lower than mid price',
      },
      {
        orderType: 'take_profit_market',
        direction: 'short',
        triggerPrice: '80000',
        family: 'take_profit',
        requiredSide: 'above',
        message: 'Trigger price must be higher than mid price',
      },
      {
        orderType: 'take_profit_limit',
        direction: 'long',
        triggerPrice: '100000',
        family: 'take_profit',
        requiredSide: 'below',
        message: 'Trigger price must be lower than mid price',
      },
      {
        orderType: 'take_profit_limit',
        direction: 'short',
        triggerPrice: '80000',
        family: 'take_profit',
        requiredSide: 'above',
        message: 'Trigger price must be higher than mid price',
      },
    ] as const)(
      'blocks $direction $orderType before blur and shows guidance after blur',
      ({
        orderType,
        direction,
        triggerPrice,
        family,
        requiredSide,
        message,
      }) => {
        mockOrderForm.type = orderType;
        mockOrderForm.direction = direction;
        mockOrderForm.limitPrice = orderType.endsWith('_limit')
          ? '90000'
          : undefined;
        mockContextValue.triggerPrice = triggerPrice;
        mockValidation.isValid = false;
        mockValidation.fieldIssues = [
          {
            field: 'triggerPrice',
            issue: {
              code: 'wrong_side',
              family,
              requiredSide,
            },
          },
        ];
        const { result, rerender } = renderProForm();

        expect(result.current.priceCardMessage).toBeUndefined();
        expect(result.current.isPlaceOrderDisabled).toBe(true);

        act(() => {
          result.current.onTriggerPriceBlur();
        });
        rerender({});

        expect(result.current.priceCardMessage).toEqual({
          severity: 'error',
          message,
        });
        expect(result.current.isPlaceOrderDisabled).toBe(true);
      },
    );

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

    it('shows a new wrong-side error when live mid crosses a blurred trigger', () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = '91000';
      const { result, rerender } = renderProForm();

      act(() => {
        result.current.onTriggerPriceBlur();
      });
      expect(result.current.priceCardMessage).toBeUndefined();

      mockLivePrice = '92000';
      mockLiveMarkPrice = '92000';
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
      rerender({});

      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Trigger price must be higher than mid price',
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
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
        expect(result.current.isPlaceOrderDisabled).toBe(true);

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
      expect(result.current.isPlaceOrderDisabled).toBe(true);

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

    it('keeps field copy blur-gated after a blocked submit attempt', async () => {
      mockOrderForm.type = 'stop_market';
      mockContextValue.triggerPrice = undefined;
      mockValidation.isValid = false;
      mockValidation.fieldIssues = [
        { field: 'triggerPrice', issue: { code: 'required' } },
      ];
      const { result } = renderProForm();

      expect(result.current.priceCardMessage).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(true);

      await act(async () => {
        await result.current.onPlaceOrderPress();
      });

      expect(validationError).toHaveBeenCalledWith(
        'Please set a trigger price',
      );
      expect(mockTrack).toHaveBeenCalledWith(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
          PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'Please set a trigger price',
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
      });
      expect(result.current.priceCardMessage).toBeUndefined();
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
    it('hides the slippage row for Chase orders', () => {
      mockOrderForm.type = 'chase';
      mockEstimatedSlippageBps = 50;
      const { result } = renderProForm();

      expect(result.current.summary.slippage).toBeUndefined();
      expect(result.current.summary.onSlippagePress).toBeUndefined();
    });

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

    it('is disabled when protocol validation is not ready for a positive amount', () => {
      // Arrange
      mockOrderForm.amount = '0.0001';
      mockValidation.isValid = false;
      mockValidation.errors = [];
      mockValidation.fieldIssues = [];

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toEqual([]);
    });

    it('is disabled without a notice for a filtered size-positive error', () => {
      // Arrange
      mockValidation.isValid = false;
      mockValidation.errors = [
        strings('perps.errors.orderValidation.sizePositive'),
      ];
      mockValidation.fieldIssues = [];

      // Act
      const { result } = renderProForm();

      // Assert
      expect(result.current.isPlaceOrderDisabled).toBe(true);
      expect(result.current.notices).toEqual([]);
    });

    it.each([
      { orderType: 'limit', missingField: 'limitPrice' },
      { orderType: 'stop_market', missingField: 'triggerPrice' },
      { orderType: 'take_profit_market', missingField: 'triggerPrice' },
      { orderType: 'stop_limit', missingField: 'triggerPrice' },
      { orderType: 'stop_limit', missingField: 'limitPrice' },
      { orderType: 'take_profit_limit', missingField: 'triggerPrice' },
      { orderType: 'take_profit_limit', missingField: 'limitPrice' },
    ] as const)(
      'is disabled for $orderType when $missingField is missing',
      ({ orderType, missingField }) => {
        // Arrange
        mockOrderForm.type = orderType;
        mockOrderForm.limitPrice =
          missingField === 'limitPrice' ? undefined : '91000';
        mockContextValue.triggerPrice =
          missingField === 'triggerPrice' ? undefined : '91000';
        mockValidation.isValid = false;
        mockValidation.fieldIssues = [
          { field: missingField, issue: { code: 'required' } },
        ];

        // Act
        const { result } = renderProForm();

        // Assert
        expect(result.current.isPlaceOrderDisabled).toBe(true);
        expect(result.current.priceCardMessage).toBeUndefined();
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

    it('is disabled while awaiting the first position-modify preview', () => {
      mockIsAwaitingPositionModifyPreview = true;

      const { result } = renderProForm();

      expect(result.current.isPlaceOrderDisabled).toBe(true);
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
    it('restores reduceOnly from the pending trade draft', () => {
      mockContextValue.pendingReduceOnly = true;

      const { result } = renderProForm();

      expect(result.current.reduceOnly).toBe(true);
    });

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
      expect(mockResetPriceInputInteraction).toHaveBeenCalledTimes(1);
      expect(mockSetOrderType).toHaveBeenCalledWith('limit');
    });

    it('clears incompatible prices when TWAP is selected', () => {
      mockOrderForm.limitPrice = '91000';
      mockContextValue.triggerPrice = '92000';
      mockOrderForm.takeProfitPrice = '95000';
      mockOrderForm.stopLossPrice = '85000';
      const { result } = renderProForm();

      act(() => {
        result.current.onOrderTypeSelect('twap');
      });

      expect(mockSetOrderType).toHaveBeenCalledWith('twap');
      expect(mockSetLimitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetTriggerPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetTakeProfitPrice).toHaveBeenCalledWith(undefined);
      expect(mockSetStopLossPrice).toHaveBeenCalledWith(undefined);
    });

    it('ignores TWAP selection while the feature gate is disabled', () => {
      const { result } = renderProForm(true, false);

      act(() => {
        result.current.onOrderTypeSelect('twap');
      });

      expect(mockSetOrderType).not.toHaveBeenCalled();
    });

    it('preserves typed digits while blocking an out-of-range duration part', () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();

      act(() => {
        result.current.twap.onHoursChange('24');
      });

      expect(result.current.twap.hours).toBe('24');
      expect(
        result.current.notices.find((notice) => notice.id === 'twap-duration'),
      ).toBeDefined();
      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('normalizes leading zeros in TWAP duration parts', () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();

      act(() => {
        result.current.twap.onMinutesChange('0000005');
      });

      expect(result.current.twap.minutes).toBe('5');
    });

    it('blocks a TWAP duration whose individually valid parts exceed the total maximum', () => {
      mockOrderForm.type = 'twap';
      const { result } = renderProForm();

      act(() => {
        result.current.twap.onDaysChange('1');
        result.current.twap.onHoursChange('1');
        result.current.twap.onMinutesChange('0');
      });

      expect(result.current.twap).toMatchObject({
        days: '1',
        hours: '1',
        minutes: '0',
      });
      expect(
        result.current.notices.find((notice) => notice.id === 'twap-duration'),
      ).toBeDefined();
    });

    it('preserves price values while resetting presentation for a new order type', () => {
      // Arrange
      mockOrderForm.type = 'stop_market';
      mockOrderForm.limitPrice = '91000';
      mockContextValue.triggerPrice = '92000';
      mockContextValue.hasBlurredTriggerPrice = true;
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
      expect(result.current.priceCardMessage).toEqual({
        severity: 'error',
        message: 'Trigger price must be higher than mid price',
      });

      // Act
      act(() => {
        result.current.onOrderTypeSelect('stop_limit');
      });
      mockOrderForm.type = 'stop_limit';
      rerender({});

      // Assert
      expect(mockResetPriceInputInteraction).toHaveBeenCalledTimes(1);
      expect(mockSetLimitPrice).not.toHaveBeenCalled();
      expect(mockSetTriggerPrice).not.toHaveBeenCalled();
      expect(mockOrderForm.limitPrice).toBe('91000');
      expect(mockContextValue.triggerPrice).toBe('92000');
      expect(result.current.priceCardMessage).toBeUndefined();
      expect(result.current.isPlaceOrderDisabled).toBe(true);
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

    it.each(['1abc', '1.2.3'])(
      'rejects malformed Chase max distance input %s',
      (value) => {
        mockOrderForm.type = 'chase';
        const { result } = renderProForm();

        act(() => result.current.onChaseMaxDistanceChange(value));

        expect(result.current.chaseMaxDistance).toBe('');
        expect(
          result.current.notices.find(
            (notice) => notice.id === 'chase-max-distance',
          ),
        ).toBeUndefined();
      },
    );

    it('normalizes Chase max distance and enforces the shared digit cap', () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      act(() => result.current.onChaseMaxDistanceChange('0012,5'));
      expect(result.current.chaseMaxDistance).toBe('12.5');

      act(() => result.current.onChaseMaxDistanceChange('1234567890'));
      expect(result.current.chaseMaxDistance).toBe('12.5');
    });

    it('clears Chase max distance only when its unit changes', () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      act(() => {
        result.current.onChaseMaxDistanceChange('25');
        result.current.onChaseMaxDistanceUnitChange('usd');
      });
      expect(result.current.chaseMaxDistance).toBe('25');

      act(() => {
        result.current.onChaseMaxDistanceUnitChange('percent');
      });

      expect(result.current.chaseMaxDistanceUnit).toBe('percent');
      expect(result.current.chaseMaxDistance).toBe('');
    });

    it('accepts a Chase percentage below the basis-point divisor', () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      act(() => {
        result.current.onChaseMaxDistanceUnitChange('percent');
        result.current.onChaseMaxDistanceChange('99.99');
      });

      expect(
        result.current.notices.find(
          (notice) => notice.id === 'chase-max-distance',
        ),
      ).toBeUndefined();
    });

    it('rejects a Chase percentage at the basis-point divisor', () => {
      mockOrderForm.type = 'chase';
      const { result } = renderProForm();

      act(() => {
        result.current.onChaseMaxDistanceUnitChange('percent');
        result.current.onChaseMaxDistanceChange('100');
      });

      expect(
        result.current.notices.find(
          (notice) => notice.id === 'chase-max-distance',
        ),
      ).toEqual({
        id: 'chase-max-distance',
        variant: 'banner',
        message: strings('perps.order.validation.chase_max_distance_percent'),
      });
      expect(result.current.isPlaceOrderDisabled).toBe(true);
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
