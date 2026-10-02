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
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_ERROR_CODES,
  type PerpsScalePriceLadder,
  type ScaleOrderGroup,
  type OrderResult,
} from '@metamask/perps-controller';
import { analytics } from '../../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { translatePerpsError } from '../../utils/translatePerpsError';
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
import {
  readPerpsUiObservations,
  perpsUiInputDigest,
} from '../../utils/perpsUiObservations';

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
const renderLighter = (leverage?: number) => {
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
            ...(leverage === undefined
              ? {}
              : { tradeConfigurations: { testnet: { ETH: { leverage } } } }),
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
  const savedDev = __DEV__;
  beforeEach(() => {
    jest.mocked(controller.getOrderCapabilities).mockResolvedValue({
      status: 'ready',
      providerId: 'lighter',
      supportedStrategies: ['scale'],
    });
    jest.mocked(controller.getScalePriceLadder).mockResolvedValue(preview);
    jest.mocked(controller.getScaleOrderGroups).mockResolvedValue([]);
    jest.mocked(controller.reviewScaleOrderGroups).mockResolvedValue([]);
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: true,
      orderId: group.groupId,
      acceptedSize: '0.04',
      acceptedChildren: [
        { state: 'resting', orderId: 'child-1' },
        { state: 'filled', orderId: 'child-2' },
        { state: 'waitingForFill' },
      ],
      childOrderIds: ['child-1'],
    });
    jest.mocked(controller.cancelOrder).mockResolvedValue({ success: true });
    jest.clearAllMocks();
  });
  afterEach(async () => {
    cleanup();
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    clearPendingPerpsCufTraces();
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  });

  it('binds the settled 1x form to its exact once-pressed dispatch and late partial result', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const prior = readPerpsUiObservations();
    const priorForms = new Set(prior.scaleForms.map((item) => item.formId));
    const currentForm = () =>
      readPerpsUiObservations().scaleForms.find(
        (item) => !priorForms.has(item.formId),
      );
    let settlePreview!: (value: PerpsScalePriceLadder) => void;
    let settleOrder!: (value: OrderResult) => void;
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(
      new Promise((resolve) => {
        settlePreview = resolve;
      }),
    );
    jest.mocked(controller.placeOrder).mockReturnValueOnce(
      new Promise((resolve) => {
        settleOrder = resolve;
      }),
    );
    const messenger = jest.spyOn(Engine.controllerMessenger, 'call');
    const originalCall = messenger.getMockImplementation() as
      | ((action: string, ...args: unknown[]) => unknown)
      | undefined;
    messenger.mockImplementation(((action: string, ...args: unknown[]) =>
      action === 'AccountsController:getSelectedAccount'
        ? { address: group.walletAddress, type: 'eip155:eoa' }
        : originalCall?.(
            action,
            ...args,
          )) as typeof Engine.controllerMessenger.call);
    const originalNetwork = controller.state.isTestnet;
    controller.state.isTestnet = true;
    const mounted = renderLighter(1);
    try {
      await configureScale();
      await waitFor(() =>
        expect(currentForm()).toEqual(
          expect.objectContaining({
            mounted: true,
            loading: true,
            stale: true,
            displayedLeverage: 1,
          }),
        ),
      );
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();

      await act(async () => settlePreview(preview));
      await waitFor(() =>
        expect(currentForm()).toEqual(
          expect.objectContaining({
            loading: false,
            stale: false,
            source: 'venue',
            displayedLeverage: 1,
            preview,
            ladder: [
              { price: '2200', size: '0.01' },
              { price: '2400', size: '0.015' },
              { price: '2600', size: '0.015' },
            ],
          }),
        ),
      );
      const settled = currentForm();
      expect(settled?.previewGeneration).toEqual(expect.any(String));
      expect(settled?.previewSequence).toBe(1);
      expect(settled?.inputDigest).toBe(
        perpsUiInputDigest({ scope: settled?.scope, input: settled?.input }),
      );
      expect(settled?.expectedRequest).toEqual(
        expect.objectContaining({
          orderType: 'scale',
          currentPrice: expect.any(Number),
          leverage: 1,
          expectedScaleLadder: {
            prices: preview.prices,
            ...preview.sizingPreview,
          },
        }),
      );
      expect(settled?.expectedRequestDigest).toBe(
        perpsUiInputDigest(settled?.expectedRequest),
      );
      expect(
        within(screen.getByTestId(FORM.LEVERAGE_BUTTON)).getByText('1x'),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));
      await waitFor(() =>
        expect(controller.placeOrder).toHaveBeenCalledTimes(1),
      );
      const pending = readPerpsUiObservations().submissions.filter(
        (item) => item.sequence > prior.submissionSequence,
      );
      const { trackingData: _trackingData, ...publicOrder } = jest.mocked(
        controller.placeOrder,
      ).mock.calls[0][0];
      expect(pending).toHaveLength(1);
      expect(settled?.expectedRequest).toEqual(publicOrder);
      expect(settled?.expectedRequestDigest).toBe(pending[0].requestDigest);
      expect(pending[0]).toEqual(
        expect.objectContaining({
          state: 'pending',
          scope: settled?.scope,
          request: publicOrder,
          requestDigest: perpsUiInputDigest(publicOrder),
        }),
      );

      mounted.unmount();
      expect(currentForm()).toEqual(
        expect.objectContaining({
          mounted: false,
          stale: true,
          expectedRequest: null,
          expectedRequestDigest: null,
        }),
      );
      const partial: OrderResult = {
        success: false,
        orderId: group.groupId,
        error: 'partial',
        acceptedSize: '0.01',
        acceptedChildren: [{ state: 'resting', orderId: 'exact-child' }],
        childOrderIds: ['exact-child'],
      };
      await act(async () => settleOrder(partial));
      await waitFor(() =>
        expect(
          readPerpsUiObservations().submissions.find(
            (item) => item.requestId === pending[0].requestId,
          ),
        ).toEqual(
          expect.objectContaining({
            state: 'settled',
            scope: settled?.scope,
            result: partial,
          }),
        ),
      );
      expect(controller.placeOrder).toHaveBeenCalledTimes(1);
    } finally {
      mounted.unmount();
      messenger.mockRestore();
      controller.state.isTestnet = originalNetwork;
    }
  });

  it('retires the observed input digest and generation while an edited Scale quote loads', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const priorForms = new Set(
      readPerpsUiObservations().scaleForms.map((item) => item.formId),
    );
    const currentForm = () =>
      readPerpsUiObservations().scaleForms.find(
        (item) => !priorForms.has(item.formId),
      );
    renderLighter(1);
    await configureScale();
    await waitFor(() => expect(currentForm()?.stale).toBe(false));
    const settled = currentForm();
    let resolve!: (value: PerpsScalePriceLadder) => void;
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );

    fireEvent.changeText(screen.getByTestId(FORM.SIZE_INPUT), '90');
    await waitFor(() =>
      expect(currentForm()).toEqual(
        expect.objectContaining({
          loading: true,
          stale: true,
          input: expect.objectContaining({ usdAmount: '90' }),
          expectedRequest: null,
          expectedRequestDigest: null,
        }),
      ),
    );

    expect(currentForm()?.inputDigest).not.toBe(settled?.inputDigest);
    expect(currentForm()?.previewGeneration).not.toBe(
      settled?.previewGeneration,
    );
    expect(currentForm()?.ladder).toBeNull();
    expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();
    expect(controller.placeOrder).not.toHaveBeenCalled();
    await act(async () => resolve(preview));
  });

  it('settles a current quote preview before the CTA can place exact exposure', async () => {
    let resolve!: (value: PerpsScalePriceLadder) => void;
    const held = new Promise<PerpsScalePriceLadder>((done) => {
      resolve = done;
    });
    jest.mocked(controller.getScalePriceLadder).mockReturnValueOnce(held);
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: true,
      orderId: group.groupId,
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
      expect(controller.placeOrder).toHaveBeenCalledWith({
        symbol: 'ETH',
        providerId: 'lighter',
        orderType: 'scale',
        isBuy: true,
        reduceOnly: false,
        size: '0.04',
        usdAmount: '100',
        currentPrice: expect.any(Number),
        leverage: expect.any(Number),
        trackingData: expect.any(Object),
        scaleMinPrice: '2200',
        scaleMaxPrice: '2600',
        scaleNumOrders: 3,
        scaleSkew: 1,
        expectedScaleLadder: {
          prices: preview.prices,
          ...preview.sizingPreview,
        },
      }),
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
      expect(controller.placeOrder).toHaveBeenCalledWith({
        symbol: 'ETH',
        providerId: 'lighter',
        orderType: 'scale',
        isBuy: true,
        reduceOnly: false,
        size: '0.04',
        currentPrice: expect.any(Number),
        leverage: expect.any(Number),
        trackingData: expect.any(Object),
        scaleMinPrice: '2200',
        scaleMaxPrice: '2600',
        scaleNumOrders: 3,
        scaleSkew: 1,
        expectedScaleLadder: {
          prices: preview.prices,
          ...preview.sizingPreview,
        },
      }),
    );
    expect(
      jest.mocked(controller.placeOrder).mock.calls[0][0].usdAmount,
    ).toBeUndefined();
  });

  it('renders failed partial acceptance and retains the Scale draft', async () => {
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: false,
      error: 'Remaining children rejected',
      orderId: group.groupId,
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

  it.each([
    PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
    'Lighter Scale ownership is full',
  ])(
    'shows definite refusal %s without group-review copy and retains the draft',
    async (error) => {
      jest.mocked(controller.placeOrder).mockResolvedValue({
        success: false,
        error,
      });
      renderLighter();
      await configureScale();
      await waitFor(() =>
        expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeEnabled(),
      );

      fireEvent.press(screen.getByTestId(FORM.PLACE_ORDER_BUTTON));

      expect(
        await screen.findByText(translatePerpsError(error)),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          strings('perps.pro_order_form.scale.orders_uncertain'),
        ),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId(FORM.SIZE_INPUT)).toHaveProp('value', '100');
      expect(screen.queryByTestId(GROUP.PANEL)).not.toBeOnTheScreen();
      expect(controller.clearPendingTradeConfiguration).not.toHaveBeenCalled();
    },
  );

  it('keeps an edited pending preview disabled without showing or tracking a validation error', async () => {
    const tracked = jest.spyOn(analytics, 'trackEvent');
    try {
      renderLighter();
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
      tracked.mockClear();

      fireEvent.changeText(screen.getByTestId(FORM.SIZE_INPUT), '110');
      await waitFor(() =>
        expect(controller.getScalePriceLadder).toHaveBeenCalledWith(
          expect.objectContaining({ sizing: { usdAmount: '110', skew: 1 } }),
        ),
      );

      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();
      expect(
        screen.queryByTestId(`${FORM.NOTICE}-scale`),
      ).not.toBeOnTheScreen();
      expect(tracked).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.PERPS_UI_INTERACTION.category,
          properties: expect.objectContaining({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
          }),
        }),
      );
      expect(controller.placeOrder).not.toHaveBeenCalled();
      await act(async () => resolve({ ...preview, sizingPreview: undefined }));
      await waitFor(() =>
        expect(screen.getByTestId(`${FORM.NOTICE}-scale`)).toBeOnTheScreen(),
      );
      expect(screen.getByTestId(FORM.PLACE_ORDER_BUTTON)).toBeDisabled();
      expect(tracked).toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.PERPS_UI_INTERACTION.category,
          properties: expect.objectContaining({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
            [PERPS_EVENT_PROPERTY.ERROR_TYPE]: 'calculation_error',
          }),
        }),
      );
    } finally {
      tracked.mockRestore();
    }
  });

  it('renders missing acceptance as unresolved and retains the Scale draft', async () => {
    jest.mocked(controller.placeOrder).mockResolvedValue({
      success: false,
      error: 'Venue outcome unknown',
      orderId: group.groupId,
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
      orderId: group.groupId,
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
    expect(
      within(row).getByText(
        strings('perps.pro_order_form.scale.groups.market_provider', {
          assetSymbol: 'ETH',
          providerName: 'Lighter',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(row).getByTestId(GROUP.accepted('lighter', group.groupId)),
    ).toHaveTextContent(
      strings('perps.pro_order_form.scale.groups.accepted', {
        count: 2,
        size: '0.025',
        assetSymbol: 'ETH',
      }),
    );
    expect(
      within(row).getByTestId(GROUP.filled('lighter', group.groupId)),
    ).toHaveTextContent(
      strings('perps.pro_order_form.scale.groups.filled', {
        size: '0.015',
        assetSymbol: 'ETH',
      }),
    );
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
      within(row).getByTestId(GROUP.state('lighter', group.groupId)),
    ).toHaveTextContent(
      strings('perps.pro_order_form.scale.groups.state.stopped'),
    );
    expect(
      within(row).getByTestId(GROUP.child('lighter', group.groupId, 0)),
    ).toHaveTextContent(
      strings('perps.pro_order_form.scale.groups.child.resting', {
        orderId: 'venue-resting-11',
      }),
    );
    expect(
      within(row).getByTestId(GROUP.child('lighter', group.groupId, 1)),
    ).toHaveTextContent(
      strings('perps.pro_order_form.scale.groups.child.filled', {
        orderId: 'venue-filled-12',
      }),
    );
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
