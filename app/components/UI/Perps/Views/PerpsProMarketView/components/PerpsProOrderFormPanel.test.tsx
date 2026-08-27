// Unit test: `usePerpsProOrderForm` is mocked to isolate container → presentational
// prop/sheet wiring from business logic. User-visible order-type behavior is
// covered by PerpsProMarketView.view.test.tsx with real Redux selectors.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  PERPS_CONSTANTS,
  type OrderType,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import PerpsProOrderFormPanel from './PerpsProOrderFormPanel';
import type {
  PerpsProScaleOrderModel,
  PerpsProSizeInputModel,
  PerpsProSizeSliderModel,
} from './PerpsProOrderForm/PerpsProOrderForm.types';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../Perps.testIds';
import { PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID } from './PerpsProModalPortal';
import {
  selectPerpsMobileScaleEnabledFlag,
  selectPerpsProTriggeredOrdersEnabledFlag,
  selectPerpsProTwapEnabledFlag,
} from '../../../selectors/featureFlags';
import { selectPerpsProvider } from '../../../selectors/perpsController';

const mockUseSelector = jest.fn();
const selectorValues = new Map<unknown, unknown>();
const mockUsePerpsProvider = jest.fn();
const mockUseIsPerpsProModeActive = jest.fn();
const mockUsePerpsProOrderForm = jest.fn();
const mockOrderTypeBottomSheet = jest.fn();
const mockCheckOrderCapability = jest.fn().mockResolvedValue(true);

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../utils/perpsModeSwitch', () => ({
  useIsPerpsProModeActive: () => mockUseIsPerpsProModeActive(),
}));

jest.mock('../../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: (params: unknown) => mockUsePerpsProvider(params),
}));

jest.mock('../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');
jest.mock('../../../../../../util/haptics');

const host = (name: string) => name as unknown as React.ComponentType<unknown>;

// Provider is a passthrough; the orchestration hook is mocked below so the
// container test focuses purely on prop/sheet wiring.
jest.mock('../../../contexts/PerpsOrderContext', () => ({
  PerpsOrderProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const DEFAULT_SIZE_INPUT: PerpsProSizeInputModel = {
  value: '100',
  denomination: { unit: 'usd' },
  canToggleDenomination: true,
  onChange: jest.fn(),
  onFocus: jest.fn(),
  onBlur: jest.fn(),
  onToggleDenomination: jest.fn(),
};

const DEFAULT_SIZE_SLIDER: PerpsProSizeSliderModel = {
  value: 100,
  maximumValue: 500,
  onValueChange: jest.fn(),
  onDragEnd: jest.fn(),
  onDragCancel: jest.fn(),
};

const DEFAULT_SCALE_ORDER: PerpsProScaleOrderModel = {
  startPrice: '',
  endPrice: '',
  totalOrders: '',
  sizeSkew: '1.00',
  onStartPriceChange: jest.fn(),
  onStartPriceBlur: jest.fn(),
  onEndPriceChange: jest.fn(),
  onEndPriceBlur: jest.fn(),
  onTotalOrdersChange: jest.fn(),
  onTotalOrdersBlur: jest.fn(),
  onSizeSkewChange: jest.fn(),
  onSizeSkewBlur: jest.fn(),
  onSizeSkewInfoPress: jest.fn(),
  rungs: [],
  marginRange: PERPS_CONSTANTS.FallbackPriceDisplay,
  liquidationRange: PERPS_CONSTANTS.FallbackPriceDisplay,
  fees: PERPS_CONSTANTS.FallbackPriceDisplay,
};

const DEFAULT_MOCK_HOOK_RESULT = {
  direction: 'long' as 'long' | 'short',
  onDirectionChange: jest.fn(),
  leverage: 5,
  onLeveragePress: jest.fn(),
  orderType: 'market' as OrderType,
  scaleOrder: DEFAULT_SCALE_ORDER,
  onOrderTypeButtonPress: jest.fn(),
  limitPrice: '',
  onLimitPriceChange: jest.fn(),
  onLimitPriceBlur: jest.fn(),
  onUseMidPricePress: jest.fn(),
  triggerPrice: '',
  onTriggerPriceChange: jest.fn(),
  onTriggerPriceBlur: jest.fn(),
  sizeInput: DEFAULT_SIZE_INPUT,
  sizeSlider: DEFAULT_SIZE_SLIDER,
  availableBalance: '$500 available',
  onAddFundsPress: jest.fn(),
  reduceOnly: false,
  onReduceOnlyChange: jest.fn(),
  twap: {
    days: '',
    hours: '',
    minutes: '5',
    randomize: false,
    onDaysChange: jest.fn(),
    onHoursChange: jest.fn(),
    onMinutesChange: jest.fn(),
    onRandomizeChange: jest.fn(),
  },
  isTPSLConfigured: false,
  onTPSLPress: jest.fn(),
  notices: [] as { id: string; variant: string; message?: string }[],
  summary: { margin: '$20.00', liquidationPrice: '$80,000', slippage: '1%' },
  isPlaceOrderDisabled: false,
  isPlaceOrderLoading: false,
  onPlaceOrderPress: jest.fn(),
  isLeverageVisible: false,
  minLeverage: 1,
  maxLeverage: 40,
  currentPrice: 90000,
  onLeverageConfirm: jest.fn(),
  closeLeverage: jest.fn(),
  isSlippageVisible: false,
  maxSlippageBps: 100,
  onSlippageSave: jest.fn(),
  closeSlippage: jest.fn(),
  isOrderTypeVisible: false,
  onOrderTypeSelect: jest.fn(),
  closeOrderType: jest.fn(),
  isEligibilityModalVisible: false,
  closeEligibilityModal: jest.fn(),
  selectedTooltip: null as string | null,
  closeTooltip: jest.fn(),
  feeMetamaskFeeRate: 0.01,
  feeProtocolFeeRate: 0.02,
  feeOriginalMetamaskFeeRate: 0.01,
  feeDiscountPercentage: 10,
};

// Mutated in place by tests; fully restored in beforeEach via Object.assign so
// no property mutation leaks across tests. The mock closure below captures this
// reference, so it must never be reassigned.
const mockHookResult = { ...DEFAULT_MOCK_HOOK_RESULT };

jest.mock('./PerpsProOrderForm/usePerpsProOrderForm', () => ({
  usePerpsProOrderForm: (params: unknown) => {
    mockUsePerpsProOrderForm(params);
    return mockHookResult;
  },
}));

// Lightweight sheet mocks that surface their key callbacks for wiring assertions.
jest.mock('../../../components/PerpsOrderTypeBottomSheet', () => {
  const { Pressable: P } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: {
      isVisible: boolean;
      onSelect: (type: string) => void;
      availableOrderTypes: readonly string[];
    }) => {
      mockOrderTypeBottomSheet(props);
      return props.isVisible
        ? ReactActual.createElement(P, {
            testID: 'mock-order-type-select',
            onPress: () => props.onSelect('limit'),
          })
        : null;
    },
  };
});

jest.mock('../../../components/PerpsLeverageBottomSheet', () => {
  const { Pressable: P } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      isVisible,
      onConfirm,
      enableConfirmHaptics,
    }: {
      isVisible: boolean;
      onConfirm: (leverage: number) => void;
      enableConfirmHaptics?: boolean;
    }) =>
      isVisible
        ? ReactActual.createElement(P, {
            testID: 'mock-leverage-confirm',
            accessibilityLabel: enableConfirmHaptics
              ? 'confirm-haptics-enabled'
              : 'confirm-haptics-off',
            onPress: () => onConfirm(10),
          })
        : null,
  };
});

jest.mock('../../../components/PerpsSlippageBottomSheet', () => {
  const { Pressable: P } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      isVisible,
      onSave,
    }: {
      isVisible: boolean;
      onSave: (bps: number) => void;
    }) =>
      isVisible
        ? ReactActual.createElement(P, {
            testID: 'mock-slippage-save',
            onPress: () => onSave(200),
          })
        : null,
  };
});

jest.mock('../../../components/PerpsBottomSheetTooltip', () => {
  const { View: V } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ contentKey }: { contentKey: string }) =>
      ReactActual.createElement(V, { testID: `mock-tooltip-${contentKey}` }),
  };
});

const market = {
  symbol: 'BTC',
  name: 'Bitcoin',
  providerId: 'hyperliquid',
} as PerpsMarketData;

const renderPanel = (
  props: Partial<React.ComponentProps<typeof PerpsProOrderFormPanel>> = {},
) => render(<PerpsProOrderFormPanel market={market} {...props} />);

describe('PerpsProOrderFormPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectorValues.clear();
    selectorValues.set(selectPerpsProTriggeredOrdersEnabledFlag, true);
    selectorValues.set(selectPerpsProTwapEnabledFlag, true);
    selectorValues.set(selectPerpsMobileScaleEnabledFlag, true);
    selectorValues.set(selectPerpsProvider, 'hyperliquid');
    mockUseSelector.mockImplementation((selector: unknown) =>
      selectorValues.get(selector),
    );
    mockUsePerpsProvider.mockReturnValue({
      isLoadingOrderCapabilities: false,
      orderCapabilities: {
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap', 'scale'],
      },
      supportsTwapOrders: true,
      supportsScaleOrders: true,
      checkOrderCapability: mockCheckOrderCapability,
    });
    mockUseIsPerpsProModeActive.mockReturnValue(true);
    // Fully restore every property (not just the few tests currently mutate) so
    // added tests can safely set any field without bleeding into later tests.
    Object.assign(mockHookResult, DEFAULT_MOCK_HOOK_RESULT);
  });

  it('renders the order form panel and presentational form', () => {
    // Arrange / Act
    renderPanel();

    // Assert
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('requests order capabilities for the market route', () => {
    const routedMarket: PerpsMarketData = {
      ...market,
      providerId: 'hyperliquid',
    };

    renderPanel({ market: routedMarket });

    expect(mockUsePerpsProvider).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
  });

  it('skips capability discovery when both strategy flags are disabled', () => {
    selectorValues.set(selectPerpsProTwapEnabledFlag, false);
    selectorValues.set(selectPerpsMobileScaleEnabledFlag, false);

    renderPanel();

    expect(mockUsePerpsProvider).toHaveBeenCalledWith(undefined);
  });

  it('discovers Scale capabilities while the TWAP flag is disabled', () => {
    selectorValues.set(selectPerpsProTwapEnabledFlag, false);

    renderPanel();

    expect(mockUsePerpsProvider).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
    expect(mockUsePerpsProOrderForm).toHaveBeenCalledWith(
      expect.objectContaining({
        isTwapEnabled: false,
        isScaleOrdersEnabled: true,
      }),
    );
  });

  it('forwards the provider route resolved by capabilities to the order form', () => {
    renderPanel();

    expect(mockUsePerpsProOrderForm).toHaveBeenCalledWith(
      expect.objectContaining({
        isTwapEnabled: true,
        isTwapAvailabilityPending: false,
        resolvedTwapProviderId: 'hyperliquid',
        checkTwapOrderSupport: expect.any(Function),
        isScaleOrdersEnabled: true,
        isScaleOrderSupportPending: false,
        checkScaleOrderSupport: expect.any(Function),
      }),
    );
  });

  it('forwards the selected Scale provider route to the order form', () => {
    renderPanel();

    expect(mockUsePerpsProOrderForm).toHaveBeenCalledWith(
      expect.objectContaining({
        scaleProviderId: 'hyperliquid',
      }),
    );
  });

  it('uses top inset on the form panel without a book separator border', () => {
    renderPanel({ isOrderBookCollapsed: false });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toHaveStyle({
      paddingTop: 16,
    });
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).not.toHaveStyle({
      borderRightWidth: 1,
    });
    expect(
      screen.queryByTestId(
        PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the order book expand control when the order book is collapsed', () => {
    renderPanel({ isOrderBookCollapsed: true });

    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('wires direction changes to the hook', () => {
    // Arrange
    renderPanel();

    // Act
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.DIRECTION_SHORT),
    );

    // Assert
    expect(mockHookResult.onDirectionChange).toHaveBeenCalledWith('short');
  });

  it('wires the reduce-only toggle to the hook', () => {
    // Arrange
    renderPanel();

    // Act
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.REDUCE_ONLY),
    );

    // Assert
    expect(mockHookResult.onReduceOnlyChange).toHaveBeenCalledWith(true);
  });

  it('wires the order-type button to the hook', () => {
    // Arrange
    renderPanel();

    // Act
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );

    // Assert
    expect(mockHookResult.onOrderTypeButtonPress).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the TWAP duration sheet from the compact Runtime row', () => {
    mockHookResult.orderType = 'twap';
    renderPanel();

    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.TWAP_DURATION_BUTTON),
    );

    expect(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.TWAP_DURATION_SHEET),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        PerpsProOrderFormSelectorsIDs.TWAP_DURATION_SHEET_CLOSE,
      ),
    );

    expect(
      screen.queryByTestId(PerpsProOrderFormSelectorsIDs.TWAP_DURATION_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('renders the size denomination returned by the hook', () => {
    mockHookResult.sizeInput = {
      ...mockHookResult.sizeInput,
      denomination: { unit: 'asset', symbol: 'BTC' },
    };

    renderPanel();

    expect(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.SIZE_UNIT_LABEL),
    ).toHaveTextContent('Size (BTC)');
    expect(
      screen.queryByTestId(PerpsProOrderFormSelectorsIDs.SIZE_PREFIX),
    ).not.toBeOnTheScreen();
  });

  it('wires size slider drag completion to the hook', () => {
    renderPanel();
    const slider = screen.UNSAFE_getByType(host('PerpsSlider'));

    expect(slider).toHaveProp('value', 100);
    expect(slider).toHaveProp('maximumValue', 500);

    slider.props.onDragEnd(20);

    expect(mockHookResult.sizeSlider.onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('wires the TP/SL row to the hook', () => {
    // Arrange
    renderPanel();

    // Act
    fireEvent.press(screen.getByTestId(PerpsProOrderFormSelectorsIDs.TPSL));

    // Assert
    expect(mockHookResult.onTPSLPress).toHaveBeenCalledTimes(1);
  });

  it('wires the Place Order button to the hook', () => {
    // Arrange
    renderPanel();

    // Act
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON),
    );

    // Assert
    expect(mockHookResult.onPlaceOrderPress).toHaveBeenCalledTimes(1);
  });

  it('confirms leverage from the leverage sheet when visible', () => {
    // Arrange
    mockHookResult.isLeverageVisible = true;
    renderPanel();

    // Act
    fireEvent.press(screen.getByTestId('mock-leverage-confirm'));

    // Assert
    expect(mockHookResult.onLeverageConfirm).toHaveBeenCalledWith(10);
    expect(screen.getByTestId('mock-leverage-confirm')).toHaveProp(
      'accessibilityLabel',
      'confirm-haptics-enabled',
    );
  });

  it('renders the leverage sheet inside the Android modal gesture root', () => {
    mockHookResult.isLeverageVisible = true;

    renderPanel();

    expect(
      screen.getByTestId(PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-leverage-confirm')).toBeOnTheScreen();
  });

  it('saves slippage from the slippage sheet when visible', () => {
    // Arrange
    mockHookResult.isSlippageVisible = true;
    renderPanel();

    // Act
    fireEvent.press(screen.getByTestId('mock-slippage-save'));

    // Assert
    expect(mockHookResult.onSlippageSave).toHaveBeenCalledWith(200);
  });

  it('selects an order type from the order-type sheet when visible', () => {
    // Arrange
    mockHookResult.isOrderTypeVisible = true;
    renderPanel();

    // Act
    fireEvent.press(screen.getByTestId('mock-order-type-select'));

    // Assert
    expect(mockHookResult.onOrderTypeSelect).toHaveBeenCalledWith('limit');
  });

  it('passes one ordered collection of implemented gated order types', () => {
    mockHookResult.isOrderTypeVisible = true;

    renderPanel();

    expect(mockOrderTypeBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: 'BTC',
        direction: 'long',
        showOrderTypeIcons: true,
        availableOrderTypes: [
          'market',
          'limit',
          'stop_limit',
          'stop_market',
          'take_profit_limit',
          'take_profit_market',
          'twap',
          'scale',
        ],
        title: 'Choose order type',
      }),
    );
  });

  it('keeps only Basic types when Pro mode is inactive', () => {
    mockUseIsPerpsProModeActive.mockReturnValue(false);
    mockHookResult.isOrderTypeVisible = true;

    renderPanel();

    expect(mockOrderTypeBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        availableOrderTypes: ['market', 'limit'],
      }),
    );
  });

  it('omits Triggered types when their remote flag is disabled', () => {
    selectorValues.set(selectPerpsProTriggeredOrdersEnabledFlag, false);
    mockHookResult.isOrderTypeVisible = true;

    renderPanel();

    expect(mockOrderTypeBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        availableOrderTypes: ['market', 'limit', 'twap', 'scale'],
      }),
    );
  });

  it('omits TWAP when market capabilities do not support it', () => {
    mockUsePerpsProvider.mockReturnValue({
      isLoadingOrderCapabilities: false,
      orderCapabilities: {
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['scale'],
      },
      supportsTwapOrders: false,
      supportsScaleOrders: true,
      checkOrderCapability: mockCheckOrderCapability,
    });
    mockHookResult.isOrderTypeVisible = true;

    renderPanel();

    expect(mockOrderTypeBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        availableOrderTypes: [
          'market',
          'limit',
          'stop_limit',
          'stop_market',
          'take_profit_limit',
          'take_profit_market',
          'scale',
        ],
      }),
    );
  });

  it('trusts TWAP support from the routed capability contract', () => {
    mockUsePerpsProvider.mockReturnValue({
      isLoadingOrderCapabilities: false,
      orderCapabilities: {
        status: 'ready',
        providerId: 'myx',
        supportedStrategies: ['twap', 'scale'],
      },
      supportsTwapOrders: true,
      supportsScaleOrders: true,
      checkOrderCapability: mockCheckOrderCapability,
    });
    mockHookResult.isOrderTypeVisible = true;

    renderPanel();

    expect(mockOrderTypeBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        availableOrderTypes: [
          'market',
          'limit',
          'stop_limit',
          'stop_market',
          'take_profit_limit',
          'take_profit_market',
          'twap',
          'scale',
        ],
      }),
    );
  });

  it('renders the fees tooltip when a tooltip is selected', () => {
    // Arrange
    mockHookResult.selectedTooltip = 'fees';

    // Act
    renderPanel();

    // Assert
    expect(screen.getByTestId('mock-tooltip-fees')).toBeOnTheScreen();
  });

  it('renders the geo-block modal when eligibility is required', () => {
    // Arrange
    mockHookResult.isEligibilityModalVisible = true;

    // Act
    renderPanel();

    // Assert
    expect(screen.getByTestId('mock-tooltip-geo_block')).toBeOnTheScreen();
  });
});
