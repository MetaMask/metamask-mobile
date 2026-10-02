import '../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  InitializationState,
  type PerpsScalePriceLadder,
  type ScaleOrderGroup,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsProMarketView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  PerpsProOrderFormSelectorsIDs as FORM,
  PerpsOrderTypeBottomSheetSelectorsIDs as PICKER,
  PerpsScaleOrderGroupsSelectorsIDs as GROUP,
} from '../../Perps.testIds';
import { clearPendingPerpsCufTraces } from '../../utils/perpsCufTrace';

const controller = Engine.context.PerpsController;
const preview: Extract<PerpsScalePriceLadder, { status: 'ready' }> = {
  status: 'ready',
  providerId: 'lighter',
  prices: ['2200', '2400', '2600'],
  sizingPreview: {
    sizes: ['0.01', '0.015', '0.015'],
    totalSize: '0.04',
    totalNotional: '97',
    minimumBaseSize: '0.001',
    minimumQuoteAmount: '1',
    sizeDecimals: 3,
  },
};
const group: ScaleOrderGroup = {
  groupId: 'lighter-scale:owned-group',
  orderId: 'lighter-scale:owned-group',
  symbol: 'ETH',
  providerId: 'lighter',
  accountIndex: 28,
  apiKeyIndex: 2,
  state: 'stopped',
  walletAddress: '0x0000000000000000000000000000000000000001',
  network: 'testnet',
  submittedSize: '0.04',
  acceptedSize: '0.025',
  filledSize: '0.015',
  acceptedChildren: [
    { state: 'resting', orderId: 'venue-resting-11' },
    { state: 'filled', orderId: 'venue-filled-12' },
  ],
  childOrderIds: ['venue-resting-11'],
};
const renderLighter = () => {
  const market = {
    ...createEthMarketForViews(),
    providerId: 'lighter' as const,
  };
  return renderPerpsProMarketView({
    includeToasts: true,
    initialParams: { market },
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
      marketData: [market],
      positions: [],
      orders: [],
    },
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'lighter',
            isTestnet: true,
            initializationState: InitializationState.Initialized,
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: { enabled: true, minimumVersion: '0.0.0' },
              perpsMobileScale: { enabled: true, minimumVersion: '0.0.0' },
            },
          },
        },
      },
    },
  });
};
async function configureScale() {
  const size = await screen.findByTestId(FORM.SIZE_INPUT);
  fireEvent.changeText(size, '100');
  await waitFor(() =>
    expect(controller.getOrderCapabilities).toHaveBeenCalled(),
  );
  fireEvent.press(screen.getByTestId(FORM.ORDER_TYPE_BUTTON));
  fireEvent.press(await screen.findByTestId(PICKER.ADVANCED_TAB));
  fireEvent.press(await screen.findByTestId(PICKER.SCALE_OPTION));
  for (const [id, value] of [
    [FORM.SCALE_START_PRICE, '2200'],
    [FORM.SCALE_END_PRICE, '2600'],
    [FORM.SCALE_TOTAL_ORDERS, '3'],
  ] as const) {
    fireEvent.press(screen.getByTestId(`${id}-field`));
    fireEvent.changeText(screen.getByTestId(id), value);
  }
}

describe('Lighter Scale through the Pro market screen', () => {
  beforeEach(() => {
    jest.mocked(controller.getOrderCapabilities).mockResolvedValue({
      status: 'ready',
      providerId: 'lighter',
      supportedStrategies: ['scale'],
    });
    jest.mocked(controller.getScalePriceLadder).mockResolvedValue(preview);
    jest.mocked(controller.getScaleOrderGroups).mockResolvedValue([]);
    jest.mocked(controller.reviewScaleOrderGroups).mockResolvedValue([]);
    jest.mocked(controller.placeOrder).mockResolvedValue({ success: true });
    jest.mocked(controller.cancelOrder).mockResolvedValue({ success: true });
    jest.clearAllMocks();
  });
  afterEach(async () => {
    cleanup();
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    clearPendingPerpsCufTraces();
  });

  it('settles a current quote preview before the CTA can place exact exposure', async () => {
    let resolve!: (value: PerpsScalePriceLadder) => void;
    const held = new Promise<PerpsScalePriceLadder>((done) => {
      resolve = done;
    });
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(held);
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: true,
      acceptedSize: '0.04',
      acceptedChildren: [
        { state: 'resting', orderId: 'child-1' },
        { state: 'filled', orderId: 'child-2' },
        { state: 'waitingForFill' },
      ],
      childOrderIds: ['child-1'],
    });
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(controller.getScalePriceLadder).toHaveBeenCalled(),
    );
    expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();

    await act(async () => resolve(preview));
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    await waitFor(() =>
      expect(controller.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          providerId: 'lighter',
          orderType: 'scale',
          size: '0.04',
          usdAmount: '100',
          scaleMinPrice: '2200',
          scaleMaxPrice: '2600',
          scaleNumOrders: 3,
          scaleSkew: 1,
        }),
      ),
    );
    expect(controller.getScalePriceLadder).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText(
        strings('perps.pro_order_form.scale.placement_summary', {
          submittedCount: 3,
          size: '0.04',
          assetSymbol: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '');
  });

  it('keeps missing venue sizing unavailable without a Hyperliquid fallback', async () => {
    jest.mocked(controller.getScalePriceLadder).mockResolvedValue({
      status: 'ready',
      providerId: 'lighter',
      prices: preview.prices,
    });
    renderLighter();

    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(`${FORM.NOTICE}-scale`)).toBeOnTheScreen(),
    );

    expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();
    expect(controller.placeOrder).not.toHaveBeenCalled();
  });

  it('submits a typed base quantity without sending a USD budget', async () => {
    renderLighter();
    await configureScale();
    fireEvent.press(screen.getByTestId(FORM.SIZE_UNIT_BUTTON));
    fireEvent.changeText(screen.getByTestId(FORM.SIZE_INPUT), '0.04');
    fireEvent(screen.getByTestId(FORM.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );

    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '0.04');
    expect(controller.getScalePriceLadder).toHaveBeenLastCalledWith(
      expect.objectContaining({ sizing: { size: '0.04', skew: 1 } }),
    );
    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    await waitFor(() =>
      expect(controller.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ size: '0.04', providerId: 'lighter' }),
      ),
    );
    expect(
      jest.mocked(controller.placeOrder).mock.calls[0][0].usdAmount,
    ).toBeUndefined();
  });

  it('renders failed partial acceptance and retains the Scale draft', async () => {
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: false,
      error: 'Remaining children rejected',
      acceptedSize: '0.025',
      acceptedChildren: group.acceptedChildren,
      childOrderIds: group.childOrderIds,
    });
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    jest.mocked(controller.getScaleOrderGroups).mockResolvedValue([group]);

    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    expect(
      await screen.findByText(
        strings('perps.pro_order_form.scale.partial_placement_summary', {
          submittedCount: 2,
          totalCount: 3,
          size: '0.025',
          assetSymbol: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '100');
    expect(screen.getByTestId(FORM.SCALE_START_PRICE)).toHaveProp(
      'value',
      '2200',
    );
    expect(
      await screen.findByTestId(GROUP.row('lighter', group.groupId)),
    ).toBeOnTheScreen();
    expect(controller.clearPendingTradeConfiguration).not.toHaveBeenCalled();
  });

  it('renders missing acceptance as unresolved and retains the Scale draft', async () => {
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: false,
      error: 'Venue outcome unknown',
      submittedSize: '0.04',
      childOrderIds: [],
    });
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );

    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    expect(
      await screen.findByText(
        strings('perps.pro_order_form.scale.orders_uncertain'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.pro_order_form.scale.orders_placed')),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '100');
    expect(screen.getByTestId(FORM.SCALE_TOTAL_ORDERS)).toHaveProp(
      'value',
      '3',
    );
    expect(controller.clearPendingTradeConfiguration).not.toHaveBeenCalled();
  });

  it('renders explicit zero acceptance as rejected rather than partial placement', async () => {
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: false,
      error: 'Venue rejected every child',
      acceptedSize: '0',
      acceptedChildren: [],
      childOrderIds: [],
    });
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );

    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    expect(
      await screen.findByText(
        strings('perps.pro_order_form.scale.orders_rejected'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('perps.pro_order_form.scale.orders_partially_placed'),
      ),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '100');
    expect(controller.clearPendingTradeConfiguration).not.toHaveBeenCalled();
  });

  it('discards a held preview when its quote input changes', async () => {
    let resolve!: (value: PerpsScalePriceLadder) => void;
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(controller.getScalePriceLadder).toHaveBeenCalledTimes(1),
    );

    fireEvent.changeText(screen.getByTestId(FORM.SIZE_INPUT), '90');
    await act(async () => resolve(preview));
    await waitFor(() =>
      expect(controller.getScalePriceLadder).toHaveBeenCalledWith(
        expect.objectContaining({ sizing: { usdAmount: '90', skew: 1 } }),
      ),
    );

    expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();
    expect(controller.placeOrder).not.toHaveBeenCalled();
  });

  it('retires a final preview when the network changes and returns', async () => {
    const { store } = renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    let resolve!: (value: PerpsScalePriceLadder) => void;
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));
    await waitFor(() =>
      expect(controller.getScalePriceLadder).toHaveBeenCalledTimes(2),
    );
    const perpsState = store.getState().engine.backgroundState.PerpsController;
    const engineState = Engine as unknown as {
      state: Record<string, unknown>;
    };
    for (const isTestnet of [false, true]) {
      act(() => {
        engineState.state = {
          ...engineState.state,
          PerpsController: { ...perpsState, isTestnet },
        };
        store.dispatch(updateBgState({ key: 'PerpsController' }));
      });
    }
    await waitFor(() =>
      expect(
        jest.mocked(controller.getScalePriceLadder).mock.calls.length,
      ).toBeGreaterThan(2),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId(`${FORM.NOTICE}-scale`),
      ).not.toBeOnTheScreen(),
    );

    await act(async () => resolve(preview));

    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(controller.clearPendingTradeConfiguration).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        strings('perps.pro_order_form.scale.orders_submitted'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.validation.error')),
    ).not.toBeOnTheScreen();
  });

  it('refuses placement when the final venue quantities differ from the displayed ladder', async () => {
    renderLighter();
    await configureScale();
    await waitFor(() =>
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    jest.mocked(controller.getScalePriceLadder).mockResolvedValueOnce({
      ...preview,
      sizingPreview: {
        minimumBaseSize: '0.001',
        minimumQuoteAmount: '1',
        sizeDecimals: 3,
        sizes: ['0.011', '0.014', '0.015'],
        totalSize: '0.04',
        totalNotional: '96.8',
      },
    });

    fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

    expect(
      await screen.findByText(strings('perps.order.validation.error')),
    ).toBeOnTheScreen();
    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '100');
  });

  it('shows every owned child and cancels only the exact strategy handle', async () => {
    jest.mocked(controller.getScaleOrderGroups).mockResolvedValue([
      group,
      {
        ...group,
        symbol: 'BTC',
        groupId: 'other-market',
        orderId: 'other-market',
      },
    ]);
    const { stream } = renderLighter();
    const row = await screen.findByTestId(GROUP.row('lighter', group.groupId));
    expect(within(row).getByText('ETH · lighter')).toBeOnTheScreen();
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.accepted', {
          count: 2,
          size: '0.025',
          assetSymbol: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.filled', {
          size: '0.015',
          assetSymbol: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.child.resting', {
          orderId: 'venue-resting-11',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.child.filled', {
          orderId: 'venue-filled-12',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GROUP.row('lighter', 'other-market')),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GROUP.cancel('lighter', group.groupId)));

    await waitFor(() =>
      expect(controller.cancelOrder).toHaveBeenCalledWith({
        orderId: group.groupId,
        symbol: 'ETH',
        providerId: 'lighter',
        orderType: 'scale',
      }),
    );
    await waitFor(() => expect(stream.getOrdersReconnectCount()).toBe(1));
  });

  it('reviews unknown outcomes without creating more children', async () => {
    const unresolved: ScaleOrderGroup = {
      ...group,
      state: 'unknown',
      acceptedSize: undefined,
      filledSize: undefined,
      acceptedChildren: [{ state: 'waitingForFill' }],
      childOrderIds: [],
    };
    jest.mocked(controller.getScaleOrderGroups).mockResolvedValue([unresolved]);
    renderLighter();
    const row = await screen.findByTestId(GROUP.row('lighter', group.groupId));
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.state.unknown'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.child.waitingForFill'),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GROUP.review('lighter', group.groupId)));

    await waitFor(() =>
      expect(controller.reviewScaleOrderGroups).toHaveBeenCalledWith({
        providerId: 'lighter',
      }),
    );
    expect(controller.placeOrder).not.toHaveBeenCalled();
  });
});
