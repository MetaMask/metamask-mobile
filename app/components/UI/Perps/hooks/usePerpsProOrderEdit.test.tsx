import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { Order, OrderResult } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { usePerpsProOrderEdit } from './usePerpsProOrderEdit';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => true),
}));

const mockEditOrder = jest.fn();
const mockShowToast = jest.fn();
const mockUpdateOrderOptimistic = jest.fn();
const mockGetSnapshot = jest.fn(() => null as Order[] | null);
const mockRunGatedEligibleAction = jest.fn(
  (_source: string, action: () => void) => action(),
);
const mockEditSubmittingToast = jest.fn(() => ({ type: 'edit-submitting' }));
const mockEditConfirmedToast = jest.fn(() => ({ type: 'edit-confirmed' }));
const mockEditFailedToast = jest.fn(() => ({ type: 'edit-failed' }));

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    editOrder: mockEditOrder,
  }),
}));

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    orders: {
      updateOrderOptimistic: mockUpdateOrderOptimistic,
      getSnapshot: mockGetSnapshot,
    },
  }),
}));

jest.mock('./usePerpsMarketData', () => ({
  usePerpsMarketData: () => ({
    marketData: { szDecimals: 3, maxLeverage: 25 },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('./stream', () => ({
  usePerpsLivePositions: () => ({
    positions: [],
    isInitialLoading: false,
  }),
}));

jest.mock('./usePerpsSelector', () => ({
  usePerpsSelector: () => undefined,
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        limit: {
          editSubmitting: mockEditSubmittingToast,
          editConfirmed: mockEditConfirmedToast,
          editFailed: mockEditFailedToast,
        },
      },
    },
  }),
}));

jest.mock(
  '../Views/PerpsProMarketView/components/PerpsProOrderEditSheets',
  () => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return function PerpsProOrderEditSheets({
      editingOrderSheet,
      editingOrderLeverage,
      onConfirmPrice,
      onConfirmSize,
    }: {
      editingOrderSheet: 'price' | 'size' | null;
      editingOrderLeverage: number;
      onConfirmPrice: (price: string) => void;
      onConfirmSize: (size: string) => void;
    }) {
      if (!editingOrderSheet) {
        return null;
      }

      return (
        <View testID={`perps-order-edit-sheet-${editingOrderSheet}`}>
          <Text testID="perps-order-edit-leverage">{editingOrderLeverage}</Text>
          <Pressable
            testID={`perps-order-edit-confirm-${editingOrderSheet}`}
            onPress={() =>
              editingOrderSheet === 'price'
                ? onConfirmPrice('170')
                : onConfirmSize('2')
            }
          >
            <Text>Confirm</Text>
          </Pressable>
          <Pressable
            testID={`perps-order-edit-confirm-same-${editingOrderSheet}`}
            onPress={() =>
              editingOrderSheet === 'price'
                ? onConfirmPrice('160.71')
                : onConfirmSize('1')
            }
          >
            <Text>Confirm same</Text>
          </Pressable>
        </View>
      );
    };
  },
);

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

const EditHarness = ({
  isMutationBlocked = false,
  onReady,
}: {
  isMutationBlocked?: boolean;
  onReady: (value: ReturnType<typeof usePerpsProOrderEdit>) => void;
}) => {
  const orderEdit = usePerpsProOrderEdit({
    isMutationBlocked,
    runGatedEligibleAction: mockRunGatedEligibleAction,
  });

  React.useEffect(() => {
    onReady(orderEdit);
  }, [onReady, orderEdit]);

  return <>{orderEdit.renderOrderEditSheets()}</>;
};

const renderOrderEditHarness = async (isMutationBlocked = false) => {
  let orderEdit: ReturnType<typeof usePerpsProOrderEdit> | undefined;

  render(
    <EditHarness
      isMutationBlocked={isMutationBlocked}
      onReady={(readyOrderEdit) => {
        orderEdit = readyOrderEdit;
      }}
    />,
  );

  await waitFor(() => {
    expect(orderEdit).toBeDefined();
  });

  if (!orderEdit) {
    throw new Error('orderEdit harness failed to initialize');
  }

  return orderEdit;
};

const openEditSheet = async (
  orderEdit: ReturnType<typeof usePerpsProOrderEdit>,
  field: 'price' | 'size',
  targetOrder: Order = order,
) => {
  await act(async () => {
    if (field === 'price') {
      orderEdit.handleEditOrderPrice(targetOrder);
    } else {
      orderEdit.handleEditOrderSize(targetOrder);
    }
  });

  await waitFor(() => {
    expect(
      screen.getByTestId(`perps-order-edit-sheet-${field}`),
    ).toBeOnTheScreen();
  });
};

const confirmEdit = async (field: 'price' | 'size') => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(`perps-order-edit-confirm-${field}`));
  });
};

describe('usePerpsProOrderEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(true);
    mockEditOrder.mockResolvedValue({ success: true });
    mockGetSnapshot.mockReturnValue(null);
  });

  it('forwards the effective leverage to the edit sheets', async () => {
    const orderEdit = await renderOrderEditHarness();

    await openEditSheet(orderEdit, 'size');

    expect(screen.getByTestId('perps-order-edit-leverage')).toHaveTextContent(
      '25',
    );
  });

  it.each(['price', 'size'] as const)(
    'submits a %s edit through the shared flow',
    async (field) => {
      const orderEdit = await renderOrderEditHarness();

      await openEditSheet(orderEdit, field);
      await confirmEdit(field);

      expect(mockUpdateOrderOptimistic).toHaveBeenCalledWith(
        order.orderId,
        field === 'price' ? { limitPrice: '170' } : { size: '2' },
      );
      expect(mockEditOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.orderId,
          watchPriceUpdate: field === 'price',
          newOrder: expect.objectContaining({
            symbol: order.symbol,
            orderType: 'limit',
            ...(field === 'price' ? { price: '170' } : { size: '2' }),
          }),
        }),
      );
      expect(mockEditSubmittingToast).toHaveBeenCalled();
      expect(mockEditConfirmedToast).toHaveBeenCalled();
      expect(mockEditFailedToast).not.toHaveBeenCalled();
    },
  );

  it.each(['price', 'size'] as const)(
    'rolls back optimistic %s edit when editOrder fails',
    async (field) => {
      mockEditOrder.mockResolvedValue({ success: false, error: 'edit failed' });
      const orderEdit = await renderOrderEditHarness();

      await openEditSheet(orderEdit, field);
      await confirmEdit(field);

      await waitFor(() => {
        expect(mockEditOrder).toHaveBeenCalled();
      });

      expect(mockUpdateOrderOptimistic).toHaveBeenNthCalledWith(
        1,
        order.orderId,
        field === 'price' ? { limitPrice: '170' } : { size: '2' },
      );
      expect(mockUpdateOrderOptimistic).toHaveBeenNthCalledWith(
        2,
        order.orderId,
        field === 'price' ? { limitPrice: order.price } : { size: '1' },
      );
      expect(mockEditFailedToast).toHaveBeenCalled();
      expect(mockEditConfirmedToast).not.toHaveBeenCalled();
    },
  );

  it.each(['price', 'size'] as const)(
    'rolls back optimistic %s edit when editOrder throws',
    async (field) => {
      mockEditOrder.mockRejectedValue(new Error('network error'));
      const orderEdit = await renderOrderEditHarness();

      await openEditSheet(orderEdit, field);
      await confirmEdit(field);

      await waitFor(() => {
        expect(mockEditOrder).toHaveBeenCalled();
      });

      expect(mockUpdateOrderOptimistic).toHaveBeenNthCalledWith(
        1,
        order.orderId,
        field === 'price' ? { limitPrice: '170' } : { size: '2' },
      );
      expect(mockUpdateOrderOptimistic).toHaveBeenNthCalledWith(
        2,
        order.orderId,
        field === 'price' ? { limitPrice: order.price } : { size: '1' },
      );
      expect(mockEditFailedToast).toHaveBeenCalled();
      expect(mockEditConfirmedToast).not.toHaveBeenCalled();
    },
  );

  it('ignores a second confirm tap while an edit is in flight', async () => {
    let resolveEdit: (value: OrderResult) => void = () => undefined;
    mockEditOrder.mockImplementation(
      () =>
        new Promise<OrderResult>((resolve) => {
          resolveEdit = resolve;
        }),
    );
    const orderEdit = await renderOrderEditHarness();
    await openEditSheet(orderEdit, 'price');

    // Two presses fired without an intervening await: both reuse the same
    // `editingOrder` closure before React flushes the state update from the
    // first tap, which is exactly the race the isSubmittingEditRef guards.
    await act(async () => {
      fireEvent.press(screen.getByTestId('perps-order-edit-confirm-price'));
      fireEvent.press(screen.getByTestId('perps-order-edit-confirm-price'));
    });

    expect(mockEditOrder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveEdit({ success: true, orderId: order.orderId });
    });
  });

  it('closes the sheet without submitting when the value is unchanged', async () => {
    const orderEdit = await renderOrderEditHarness();
    await openEditSheet(orderEdit, 'price');

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('perps-order-edit-confirm-same-price'),
      );
    });

    expect(mockEditOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrderOptimistic).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByTestId('perps-order-edit-sheet-price'),
      ).not.toBeOnTheScreen();
    });
  });

  it('does not open the sheet when a mutation is blocked', async () => {
    const orderEdit = await renderOrderEditHarness(true);

    await act(async () => {
      orderEdit.handleEditOrderPrice(order);
    });

    expect(
      screen.queryByTestId('perps-order-edit-sheet-price'),
    ).not.toBeOnTheScreen();
    expect(mockRunGatedEligibleAction).not.toHaveBeenCalled();
  });

  it('aborts confirm when a mutation becomes blocked while the sheet is open', async () => {
    let orderEdit: ReturnType<typeof usePerpsProOrderEdit> | undefined;
    const { rerender } = render(
      <EditHarness
        isMutationBlocked={false}
        onReady={(readyOrderEdit) => {
          orderEdit = readyOrderEdit;
        }}
      />,
    );

    await waitFor(() => {
      expect(orderEdit).toBeDefined();
    });
    if (!orderEdit) {
      throw new Error('orderEdit harness failed to initialize');
    }

    await openEditSheet(orderEdit, 'price');

    rerender(
      <EditHarness
        isMutationBlocked
        onReady={(readyOrderEdit) => {
          orderEdit = readyOrderEdit;
        }}
      />,
    );

    await waitFor(() => {
      expect(orderEdit).toBeDefined();
    });
    await confirmEdit('price');

    expect(mockEditOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrderOptimistic).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByTestId('perps-order-edit-sheet-price'),
      ).not.toBeOnTheScreen();
    });
  });

  it('does not open the size sheet for orders with attached TP/SL', async () => {
    const orderEdit = await renderOrderEditHarness();
    const orderWithTpSl: Order = {
      ...order,
      takeProfitPrice: '200',
      stopLossPrice: '100',
    };

    await act(async () => {
      orderEdit.handleEditOrderSize(orderWithTpSl);
    });

    expect(
      screen.queryByTestId('perps-order-edit-sheet-size'),
    ).not.toBeOnTheScreen();
    expect(mockRunGatedEligibleAction).not.toHaveBeenCalled();
  });

  it('re-checks live order eligibility from the stream snapshot on confirm', async () => {
    mockGetSnapshot.mockReturnValue([
      {
        ...order,
        filledSize: '0.5',
        remainingSize: '0.5',
      },
    ]);
    const orderEdit = await renderOrderEditHarness();
    await openEditSheet(orderEdit, 'price');
    await confirmEdit('price');

    expect(mockEditOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrderOptimistic).not.toHaveBeenCalled();
  });

  it('aborts confirm when the order is absent from a loaded snapshot', async () => {
    // Snapshot exists but the editing order was cancelled/filled while open —
    // must not fall back to the stale open-time editingOrder and submit.
    mockGetSnapshot.mockReturnValue([]);
    const orderEdit = await renderOrderEditHarness();
    await openEditSheet(orderEdit, 'price');
    await confirmEdit('price');

    expect(mockEditOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrderOptimistic).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByTestId('perps-order-edit-sheet-price'),
      ).not.toBeOnTheScreen();
    });
  });

  it('submits using the open-time order when the stream snapshot is unavailable', async () => {
    mockGetSnapshot.mockReturnValue(null);
    const orderEdit = await renderOrderEditHarness();
    await openEditSheet(orderEdit, 'price');
    await confirmEdit('price');

    expect(mockEditOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.orderId,
        newOrder: expect.objectContaining({ price: '170' }),
      }),
    );
  });
});
