import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { Order, Position } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import { usePerpsProPositionsPanelActions } from '../../../hooks/usePerpsProPositionsPanelActions';
import PerpsProPositionCard from './PerpsProPositionCard';
import PerpsProOrderCard from './PerpsProOrderCard';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => true),
}));

const mockNavigate = jest.fn();
const mockNavigateToClosePosition = jest.fn();
const mockCancelOrder = jest.fn();
const mockEditOrder = jest.fn();
const mockShowToast = jest.fn();
const mockGate = jest.fn((callback: () => void | Promise<void>) => callback());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../Compliance', () => ({
  useComplianceGate: () => ({ gate: mockGate }),
}));

jest.mock('../../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: jest.fn() }),
}));

jest.mock('../../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToClosePosition: mockNavigateToClosePosition,
  }),
}));

jest.mock('../../../hooks/usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    cancelOrder: mockCancelOrder,
    editOrder: mockEditOrder,
  }),
}));

const mockHandleUpdateTPSL = jest.fn();
const mockUpdateOrderOptimistic = jest.fn();

jest.mock('../../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    orders: {
      updateOrderOptimistic: mockUpdateOrderOptimistic,
      getSnapshot: jest.fn(() => null),
    },
    positions: {
      getSnapshot: jest.fn(() => null),
      subscribe: jest.fn(() => jest.fn()),
    },
  }),
}));

jest.mock('../../../hooks/usePerpsSelector', () => ({
  usePerpsSelector: () => undefined,
}));

jest.mock('../../../hooks/usePerpsTPSLUpdate', () => ({
  usePerpsTPSLUpdate: () => ({
    handleUpdateTPSL: mockHandleUpdateTPSL,
    isUpdating: false,
  }),
}));

jest.mock('../../../hooks/usePerpsMarketData', () => ({
  usePerpsMarketData: () => ({
    marketData: { szDecimals: 3 },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        shared: {
          submitting: jest.fn(() => ({ title: 'submitting' })),
          cancellationInProgress: jest.fn(() => ({ title: 'canceling' })),
          cancellationSuccess: jest.fn(() => ({ title: 'success' })),
          cancellationFailed: { title: 'failed' },
        },
        limit: {
          confirmed: jest.fn(() => ({ title: 'confirmed' })),
          creationFailed: jest.fn(() => ({ title: 'creation-failed' })),
          editSubmitting: jest.fn(() => ({ title: 'edit-submitting' })),
          editConfirmed: jest.fn(() => ({ title: 'edit-confirmed' })),
          editFailed: jest.fn(() => ({ title: 'edit-failed' })),
        },
      },
    },
  }),
}));

jest.mock(
  '../../../Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView',
  () => {
    const { View } = jest.requireActual('react-native');
    return function PerpsCloseAllPositionsView() {
      return <View testID="perps-close-all-positions-view" />;
    };
  },
);

jest.mock(
  '../../../components/PerpsFlipPositionConfirmSheet/PerpsFlipPositionConfirmSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    return function PerpsFlipPositionConfirmSheet() {
      return <View testID="perps-flip-position-confirm-sheet" />;
    };
  },
);

jest.mock(
  '../../../Views/PerpsSelectAdjustMarginActionView/PerpsSelectAdjustMarginActionView',
  () => {
    const { View } = jest.requireActual('react-native');
    return function PerpsSelectAdjustMarginActionView() {
      return <View testID="perps-select-adjust-margin-action-view" />;
    };
  },
);

jest.mock('../../../components/PerpsBottomSheetTooltip', () => {
  const { View } = jest.requireActual('react-native');
  return function PerpsBottomSheetTooltip() {
    return <View testID="perps-bottom-sheet-tooltip" />;
  };
});

jest.mock(
  '../../../components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet',
  () => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return function PerpsLimitPriceBottomSheet({
      onConfirm,
    }: {
      onConfirm: (price: string) => void;
    }) {
      return (
        <View testID="perps-limit-price-bottom-sheet">
          <Pressable
            testID="perps-limit-price-confirm"
            onPress={() => onConfirm('170')}
          >
            <Text>Confirm</Text>
          </Pressable>
        </View>
      );
    };
  },
);

jest.mock(
  '../../../components/PerpsOrderSizeBottomSheet/PerpsOrderSizeBottomSheet',
  () => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return function PerpsOrderSizeBottomSheet({
      onConfirm,
    }: {
      onConfirm: (size: string) => void;
    }) {
      return (
        <View testID="perps-order-size-bottom-sheet">
          <Pressable
            testID="perps-order-size-confirm"
            onPress={() => onConfirm('2')}
          >
            <Text>Confirm</Text>
          </Pressable>
        </View>
      );
    };
  },
);

const position: Position = {
  symbol: 'ETH',
  size: '1.5',
  entryPrice: '2900',
  positionValue: '4350',
  unrealizedPnl: '150',
  marginUsed: '1450',
  leverage: { type: 'isolated', value: 3 },
  liquidationPrice: '2500',
  maxLeverage: 50,
  returnOnEquity: '0.103',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
};

const order: Order = {
  orderId: 'order-1',
  symbol: 'SOL',
  side: 'buy',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '160.71',
  orderType: 'limit',
  status: 'open',
  timestamp: 1_711_756_800_000, // 2024-03-30T00:00:00.000Z — fixed for determinism
  reduceOnly: false,
  isTrigger: false,
};

const ActionHarness = ({
  onReady,
}: {
  onReady: (
    actions: ReturnType<typeof usePerpsProPositionsPanelActions>,
  ) => void;
}) => {
  const actions = usePerpsProPositionsPanelActions();
  React.useEffect(() => {
    onReady(actions);
  }, [actions, onReady]);

  return <>{actions.renderActionSheets()}</>;
};

describe('usePerpsProPositionsPanelActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(true);
    mockCancelOrder.mockResolvedValue({ success: true });
    mockEditOrder.mockResolvedValue({ success: true });
  });

  it('navigates to close position with existing flow attribution', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleClosePosition(position);
    });

    expect(mockGate).toHaveBeenCalled();
    expect(mockNavigateToClosePosition).toHaveBeenCalledWith(
      position,
      'perp_asset_screen',
      expect.objectContaining({
        buttonClicked: 'close',
        buttonLocation: 'perp_market_details',
      }),
    );
  });

  it('opens reverse confirmation sheet for the selected position', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleReversePosition(position);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('perps-flip-position-confirm-sheet'),
      ).toBeOnTheScreen();
    });
  });

  it('navigates to share PnL with derived mark price', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleSharePosition(position);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PNL_HERO_CARD, {
      position,
      marketPrice: '2900',
    });
  });

  it('cancels an order using the existing trading flow', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      await actions?.handleCancelOrder(order);
    });

    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.orderId,
        symbol: order.symbol,
        trackingData: expect.objectContaining({
          source: 'perp_asset_screen',
        }),
      }),
    );
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('edits an order price through the limit price sheet', async () => {
    let resolveEdit!: (value: { success: boolean }) => void;
    mockEditOrder.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEdit = resolve;
        }),
    );
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleEditOrderPrice(order);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('perps-limit-price-bottom-sheet'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('perps-limit-price-confirm'));
    });

    expect(
      screen.queryByTestId('perps-limit-price-bottom-sheet'),
    ).not.toBeOnTheScreen();
    expect(mockUpdateOrderOptimistic).toHaveBeenCalledWith(order.orderId, {
      limitPrice: '170',
    });
    expect(mockEditOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.orderId,
        newOrder: expect.objectContaining({
          symbol: order.symbol,
          price: '170',
          orderType: 'limit',
        }),
      }),
    );

    await act(async () => {
      resolveEdit({ success: true });
    });

    expect(mockShowToast).toHaveBeenCalled();
  });

  it('edits an order size through the size bottom sheet', async () => {
    let resolveEdit!: (value: { success: boolean }) => void;
    mockEditOrder.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEdit = resolve;
        }),
    );
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleEditOrderSize(order);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('perps-order-size-bottom-sheet'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('perps-order-size-confirm'));
    });

    expect(
      screen.queryByTestId('perps-order-size-bottom-sheet'),
    ).not.toBeOnTheScreen();
    expect(mockUpdateOrderOptimistic).toHaveBeenCalledWith(order.orderId, {
      size: '2',
    });
    expect(mockEditOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.orderId,
        newOrder: expect.objectContaining({
          symbol: order.symbol,
          size: '2',
          orderType: 'limit',
        }),
      }),
    );

    await act(async () => {
      resolveEdit({ success: true });
    });

    expect(mockShowToast).toHaveBeenCalled();
  });

  it('renders close-all sheet when handler is invoked', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleCloseAllPress();
    });

    expect(mockGate).toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByTestId('perps-close-all-positions-view'),
      ).toBeOnTheScreen();
    });
  });
});

describe('PerpsProPositionsPanel action callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(true);
    mockCancelOrder.mockResolvedValue({ success: true });
    mockEditOrder.mockResolvedValue({ success: true });
  });

  it('invokes position action callbacks from card controls', () => {
    const onClose = jest.fn();
    const onReverse = jest.fn();
    const onShare = jest.fn();

    render(
      <PerpsProPositionCard
        position={position}
        onClose={onClose}
        onReverse={onReverse}
        onShare={onShare}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_CLOSE),
    );
    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_REVERSE),
    );
    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_SHARE),
    );

    expect(onClose).toHaveBeenCalledWith(position);
    expect(onReverse).toHaveBeenCalledWith(position);
    expect(onShare).toHaveBeenCalledWith(position);
  });

  it('opens adjust margin sheet when edit margin is pressed', async () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    await act(async () => {
      actions?.handleEditPositionMargin(position);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('perps-select-adjust-margin-action-view'),
      ).toBeOnTheScreen();
    });
  });

  it('navigates to TP/SL screen when edit control is pressed', () => {
    let actions:
      | ReturnType<typeof usePerpsProPositionsPanelActions>
      | undefined;

    render(
      <ActionHarness
        onReady={(readyActions) => {
          actions = readyActions;
        }}
      />,
    );

    actions?.handleEditPositionTpSl(position);

    expect(mockGate).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PERPS.TPSL,
      expect.objectContaining({
        asset: position.symbol,
        position,
        initialTakeProfitPrice: position.takeProfitPrice,
        initialStopLossPrice: position.stopLossPrice,
        leverage: position.leverage.value,
      }),
    );
  });

  it('invokes edit TP/SL callback from position card control', () => {
    const onEditTpSl = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditTpSl={onEditTpSl} />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_EDIT_TPSL),
    );

    expect(onEditTpSl).toHaveBeenCalledWith(position);
  });

  it('invokes edit margin callback from position card control', () => {
    const onEditMargin = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditMargin={onEditMargin} />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_EDIT_MARGIN),
    );

    expect(onEditMargin).toHaveBeenCalledWith(position);
  });

  it('does not render margin edit control for cross margin positions', () => {
    render(
      <PerpsProPositionCard
        position={{
          ...position,
          leverage: { type: 'cross', value: 3 },
        }}
        onEditMargin={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(PerpsProMarketViewSelectorsIDs.POSITION_EDIT_MARGIN),
    ).toBeNull();
  });

  it('invokes cancel callback from order card control', () => {
    const onCancel = jest.fn();

    render(<PerpsProOrderCard order={order} onCancel={onCancel} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_CANCEL),
    );

    expect(onCancel).toHaveBeenCalledWith(order);
  });

  it('invokes edit price callback from order card edit button', () => {
    const onEditPrice = jest.fn();

    render(<PerpsProOrderCard order={order} onEditPrice={onEditPrice} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_EDIT),
    );

    expect(onEditPrice).toHaveBeenCalledWith(order);
  });

  it('invokes edit price callback from order card price control', () => {
    const onEditPrice = jest.fn();

    render(<PerpsProOrderCard order={order} onEditPrice={onEditPrice} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_PRICE_EDIT),
    );

    expect(onEditPrice).toHaveBeenCalledWith(order);
  });

  it('invokes edit size callback from order card size control', () => {
    const onEditSize = jest.fn();

    render(<PerpsProOrderCard order={order} onEditSize={onEditSize} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_SIZE_EDIT),
    );

    expect(onEditSize).toHaveBeenCalledWith(order);
  });

  it('invokes close-all callback from positions summary header', () => {
    const onCloseAll = jest.fn();

    render(
      <PerpsProUnrealizedPnl
        unrealizedPnl="150"
        returnOnEquity="10"
        positionCount={1}
        onCloseAll={onCloseAll}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_CLOSE_ALL),
    );

    expect(onCloseAll).toHaveBeenCalled();
  });
});
