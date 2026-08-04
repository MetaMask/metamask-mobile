// Unit test: `usePerpsProOrderForm` is mocked to isolate container → presentational
// prop/sheet wiring from business logic. A full component-view test (real Redux
// state + stream fixtures) is deferred until the Pro form's view-test renderer is
// established alongside PerpsOrderView.view.test.tsx.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import PerpsProOrderFormPanel from './PerpsProOrderFormPanel';
import type { PerpsProSizeInputModel } from './PerpsProOrderForm/PerpsProOrderForm.types';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../Perps.testIds';

jest.mock('../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');

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

const DEFAULT_MOCK_HOOK_RESULT = {
  direction: 'long' as 'long' | 'short',
  onDirectionChange: jest.fn(),
  leverage: 5,
  onLeveragePress: jest.fn(),
  orderType: 'market' as 'market' | 'limit',
  onOrderTypeButtonPress: jest.fn(),
  limitPrice: '',
  onLimitPriceChange: jest.fn(),
  onLimitPriceBlur: jest.fn(),
  onUseMidPricePress: jest.fn(),
  sizeInput: DEFAULT_SIZE_INPUT,
  balancePercentage: 20,
  onBalancePercentageChange: jest.fn(),
  onBalancePercentageDragEnd: jest.fn(),
  onBalancePercentageDragCancel: jest.fn(),
  availableBalance: '$500 available',
  onAddFundsPress: jest.fn(),
  reduceOnly: false,
  onReduceOnlyChange: jest.fn(),
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
  usePerpsProOrderForm: () => mockHookResult,
}));

// Lightweight sheet mocks that surface their key callbacks for wiring assertions.
jest.mock(
  '../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView',
  () => {
    const { Pressable: P } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return {
      __esModule: true,
      default: ({
        isVisible,
        onSelect,
      }: {
        isVisible: boolean;
        onSelect: (type: string) => void;
      }) =>
        isVisible
          ? ReactActual.createElement(P, {
              testID: 'mock-order-type-select',
              onPress: () => onSelect('limit'),
            })
          : null,
    };
  },
);

jest.mock('../../../components/PerpsLeverageBottomSheet', () => {
  const { Pressable: P } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      isVisible,
      onConfirm,
    }: {
      isVisible: boolean;
      onConfirm: (leverage: number) => void;
    }) =>
      isVisible
        ? ReactActual.createElement(P, {
            testID: 'mock-leverage-confirm',
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

const market = { symbol: 'BTC', name: 'Bitcoin' } as PerpsMarketData;

const renderPanel = (
  props: Partial<React.ComponentProps<typeof PerpsProOrderFormPanel>> = {},
) => render(<PerpsProOrderFormPanel market={market} {...props} />);

describe('PerpsProOrderFormPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders the book separator on the form when the order book is visible', () => {
    renderPanel({ isOrderBookCollapsed: false });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toHaveStyle({
      borderRightWidth: 1,
      paddingRight: 16,
    });
  });

  it('omits the book separator when the order book is collapsed', () => {
    renderPanel({ isOrderBookCollapsed: true });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).not.toHaveStyle({
      borderRightWidth: 1,
    });
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

    slider.props.onDragEnd(20);

    expect(mockHookResult.onBalancePercentageDragEnd).toHaveBeenCalledTimes(1);
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
