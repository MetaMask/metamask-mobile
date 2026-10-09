import '../../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type {
  MarketInfo,
  PerpsMarketData,
  PositionModifyPreviewResult,
} from '@metamask/perps-controller';
import type { ComponentType } from 'react';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  crossMarginMarketInfo,
  openMarginModeSheet,
  resetMarginModeControllerMocks,
} from '../../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import {
  createPerpsControllerStateHarness,
  wirePerpsControllerForStore,
} from '../../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import PerpsTPSLView from '../../PerpsTPSLView/PerpsTPSLView';
import {
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsOrderTypeBottomSheetSelectorsIDs as orderTypeIds,
  PerpsProOrderFormSelectorsIDs as formIds,
  PerpsTPSLViewSelectorsIDs as tpslIds,
} from '../../../Perps.testIds';

interface CrossGateCase {
  name: string;
  flag?: boolean;
  pro?: boolean;
  terminal?: boolean;
  market?: Partial<PerpsMarketData>;
  metadata?: Partial<MarketInfo>;
}

const blockedMarkets: CrossGateCase[] = [
  { name: 'rollout flag off', flag: false },
  { name: 'Pro inactive', pro: false },
  { name: 'Terminal backend', terminal: true },
  { name: 'HIP-3 market', market: { marketSource: 'xyz' } },
  { name: 'Lighter market', market: { providerId: 'lighter' } },
  { name: 'isolated-only asset', metadata: { onlyIsolated: true } },
  { name: 'noCross asset', metadata: { marginMode: 'noCross' } },
  { name: 'strictIsolated asset', metadata: { marginMode: 'strictIsolated' } },
];

describeForPlatforms('PerpsProOrderFormPanel Cross orders', () => {
  let unwire: (() => void) | undefined;
  beforeEach(resetMarginModeControllerMocks);
  afterEach(() => {
    cleanup();
    unwire?.();
    unwire = undefined;
    jest
      .mocked(Engine.context.PerpsController.previewPositionModify)
      .mockReset()
      .mockResolvedValue({ status: 'none' });
  });

  it('drops retained isolated liquidation and stop risk when the live position becomes Cross', async () => {
    const isolatedPosition = createLongPositionForViews({
      providerId: 'hyperliquid',
    });
    const crossPosition = {
      ...isolatedPosition,
      leverage: { ...isolatedPosition.leverage, type: 'cross' as const },
    };
    const isolatedPreview: PositionModifyPreviewResult = {
      status: 'open',
      kind: 'increase',
      current: {
        margin: { available: true, value: 833.33 },
        liquidationPrice: { available: true, value: 1800 },
      },
      resulting: {
        direction: 'long',
        size: 1.04,
        entryPrice: 2500,
        leverage: 3,
        margin: { available: true, value: 866.67 },
        liquidationPrice: { available: true, value: 2100 },
      },
    };
    let resolveCrossPreview: (
      result: PositionModifyPreviewResult,
    ) => void = () => undefined;
    const pendingCrossPreview = new Promise<PositionModifyPreviewResult>(
      (resolve) => {
        resolveCrossPreview = resolve;
      },
    );
    jest
      .mocked(Engine.context.PerpsController.previewPositionModify)
      .mockImplementation(({ position }) =>
        position.leverage.type === 'cross'
          ? pendingCrossPreview
          : Promise.resolve(isolatedPreview),
      );
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockResolvedValue('1800');
    const { store, stream } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        account: createFundedAccountForViews('1000'),
        positions: [isolatedPosition],
      },
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPositionModifyPreviewEnabled: {
                  enabled: true,
                  minimumVersion: '0.0.0',
                },
              },
            },
          },
        },
      },
      extraRoutes: [
        {
          name: Routes.PERPS.TPSL,
          Component: PerpsTPSLView as unknown as ComponentType<unknown>,
        },
      ],
    });
    unwire = wirePerpsControllerForStore(store);

    fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
        /\$1,800\s*→\s*\$2,100/,
      ),
    );
    fireEvent.press(screen.getByTestId(formIds.TPSL));
    fireEvent.changeText(
      await screen.findByTestId(tpslIds.STOP_LOSS_PRICE_INPUT),
      '2000',
    );
    await waitFor(() =>
      expect(screen.getByTestId(tpslIds.SET_BUTTON)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(tpslIds.SET_BUTTON));
    await waitFor(() =>
      expect(screen.queryByTestId(tpslIds.SET_BUTTON)).not.toBeOnTheScreen(),
    );
    await waitFor(() =>
      expect(
        screen.getByText(
          strings('perps.tpsl.stop_loss_order_view_warning', {
            direction: strings('perps.tpsl.below'),
          }),
        ),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeDisabled();

    act(() => stream.emitPositions([crossPosition]));
    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
    await waitFor(() =>
      expect(
        Engine.context.PerpsController.previewPositionModify,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ position: crossPosition }),
      ),
    );

    expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
      /--/,
    );
    expect(
      screen.getByTestId(formIds.SUMMARY_LIQUIDATION),
    ).not.toHaveTextContent(/\$/);
    await waitFor(() =>
      expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    expect(
      screen.queryByText(
        strings('perps.tpsl.stop_loss_order_view_warning', {
          direction: strings('perps.tpsl.below'),
        }),
      ),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));
    await waitFor(() =>
      expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ marginMode: 'cross', stopLossPrice: '2000' }),
      ),
    );
    await act(async () =>
      resolveCrossPreview({ status: 'unsupported', reason: 'cross_margin' }),
    );
  });

  it('selects Cross, updates the form and submits the chosen mode', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { account: createFundedAccountForViews('1000') },
    });
    unwire = wirePerpsControllerForStore(store);
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );

    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
    fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(
      () =>
        expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
      { timeout: 5000 },
    );
    expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
      /--/,
    );
    fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));

    await waitFor(
      () =>
        expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'ETH',
            orderType: 'market',
            marginMode: 'cross',
            isBuy: true,
          }),
        ),
      { timeout: 5000 },
    );
  });

  it('switches back to Isolated without an open position', async () => {
    renderPerpsCrossMarginOrderFormPanel();
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );

    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.ISOLATED_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.ISOLATED_OPTION));

    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.pro_order_form.isolated'),
    );
  });

  it('shows the Cross warning instead of submitting an existing Cross position when the flag is off', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      crossMarginEnabled: false,
      streamOverrides: {
        account: createFundedAccountForViews('1000'),
        positions: [
          createLongPositionForViews({
            providerId: 'hyperliquid',
            leverage: { type: 'cross', value: 3 },
          }),
        ],
      },
      extraRoutes: [{ name: Routes.PERPS.MODALS.ROOT }],
    });
    unwire = wirePerpsControllerForStore(store);

    fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
    ).toBeOnTheScreen();
    expect(Engine.context.PerpsController.placeOrder).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'rejected'] as const)(
    'keeps Cross disabled but allows an isolated order when the venue lock is %s',
    async (result) => {
      const readLock = jest.mocked(
        Engine.context.PerpsController.getMarginModeLock,
      );
      if (result === 'rejected') {
        readLock.mockRejectedValue(new Error('Venue read failed'));
      } else {
        readLock.mockResolvedValue({
          status: 'unavailable',
          providerId: 'hyperliquid',
          reason: 'provider_unavailable',
        });
      }
      const { store } = renderPerpsCrossMarginOrderFormPanel({
        streamOverrides: { account: createFundedAccountForViews('1000') },
      });
      unwire = wirePerpsControllerForStore(store);
      // The helper awaits successful reads; rejection is owned by the hook.
      await openMarginModeSheet(result !== 'rejected');
      await waitFor(() =>
        expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled(),
      );

      fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

      expect(screen.getByTestId(marginIds.CONTAINER)).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(marginIds.ISOLATED_OPTION));
      await waitFor(() =>
        expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
      );
      fireEvent.changeText(screen.getByTestId(formIds.SIZE_INPUT), '100');
      fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
      await waitFor(() =>
        expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
      );
      fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));

      await waitFor(() =>
        expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({ marginMode: 'isolated' }),
        ),
      );
    },
  );

  it('uses the Cross resting-order lock in the picker and submitted order', async () => {
    jest
      .mocked(Engine.context.PerpsController.getMarginModeLock)
      .mockResolvedValue({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'cross',
        reason: 'open_order',
      });
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { account: createFundedAccountForViews('1000') },
    });
    unwire = wirePerpsControllerForStore(store);
    await openMarginModeSheet();

    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
    expect(screen.getByTestId(marginIds.ISOLATED_OPTION)).toBeDisabled();
    fireEvent.press(screen.getByTestId(marginIds.ISOLATED_OPTION));
    expect(screen.getByTestId(marginIds.CONTAINER)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    fireEvent.changeText(screen.getByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));

    await waitFor(() =>
      expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ marginMode: 'cross' }),
      ),
    );
  });

  it('re-reads the venue lock after placement before the picker is reopened', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { account: createFundedAccountForViews('1000') },
    });
    unwire = wirePerpsControllerForStore(store);
    await openMarginModeSheet();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    // Resting-order acceptance runs onSuccess immediately; market orders wait
    // for their fill to arrive on the position stream before that callback.
    fireEvent.press(screen.getByTestId(formIds.ORDER_TYPE_BUTTON));
    fireEvent.press(await screen.findByTestId(orderTypeIds.LIMIT_OPTION));
    fireEvent.changeText(
      await screen.findByTestId(formIds.LIMIT_PRICE_INPUT, {
        includeHiddenElements: true,
      }),
      '2400',
    );
    fireEvent(
      screen.getByTestId(formIds.LIMIT_PRICE_INPUT, {
        includeHiddenElements: true,
      }),
      'blur',
    );
    fireEvent.changeText(screen.getByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
    );
    const readLock = jest.mocked(
      Engine.context.PerpsController.getMarginModeLock,
    );
    readLock.mockClear().mockResolvedValue({
      status: 'locked',
      providerId: 'hyperliquid',
      marginMode: 'cross',
      reason: 'open_order',
    });

    fireEvent.press(screen.getByTestId(formIds.PLACE_ORDER_BUTTON));

    await waitFor(() =>
      expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ orderType: 'limit', marginMode: 'cross' }),
      ),
    );
    await waitFor(() =>
      expect(readLock).toHaveBeenCalledWith({
        symbol: 'ETH',
        providerId: 'hyperliquid',
      }),
    );
    expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen();
    await openMarginModeSheet();
    expect(screen.getByTestId(marginIds.ISOLATED_OPTION)).toBeDisabled();
  });

  it('uses the selected provider metadata and ignores another provider position with the same symbol', async () => {
    jest
      .mocked(Engine.context.PerpsController.getMarkets)
      .mockResolvedValue([
        { ...crossMarginMarketInfo, providerId: 'lighter', onlyIsolated: true },
        crossMarginMarketInfo,
      ]);
    renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        positions: [createLongPositionForViews({ providerId: 'lighter' })],
      },
    });

    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
  });

  it('forgets the selected Cross mode after the Perps network changes', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel();
    const controllerState = createPerpsControllerStateHarness(store);
    unwire = controllerState.cleanup;
    await openMarginModeSheet();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );

    act(() => controllerState.sync({ isTestnet: true }));

    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.pro_order_form.isolated'),
      ),
    );
    expect(
      screen.getByTestId(formIds.MARGIN_MODE_BUTTON),
    ).not.toHaveTextContent(strings('perps.margin_mode.cross_title'));
  });

  it.each(blockedMarkets)('keeps Cross unavailable for $name', async (gate) => {
    jest
      .mocked(Engine.context.PerpsController.getMarkets)
      .mockResolvedValue([{ ...crossMarginMarketInfo, ...gate.metadata }]);
    const market = createEthMarketForViews(gate.market);
    renderPerpsCrossMarginOrderFormPanel({
      crossMarginEnabled: gate.flag ?? true,
      initialParams: { market },
      streamOverrides: { marketData: [market] },
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsProModeEnabled: {
                  enabled: gate.pro ?? true,
                  minimumVersion: '0.0.0',
                },
                perpsTerminalBackendEnabled: {
                  enabled: gate.terminal ?? false,
                  minimumVersion: '0.0.0',
                },
              },
            },
          },
        },
      },
    });

    await openMarginModeSheet();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

    expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled();
    expect(screen.getByTestId(marginIds.CONTAINER)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.margin_mode.cross_description')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.pro_order_form.isolated'),
    );
    expect(Engine.context.PerpsController.placeOrder).not.toHaveBeenCalled();
  });

  it('holds Cross selection and submission until the venue lock resolves', async () => {
    let resolveLock: (value: {
      status: 'unlocked';
      providerId: 'hyperliquid';
    }) => void = () => undefined;
    jest
      .mocked(Engine.context.PerpsController.getMarginModeLock)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLock = resolve;
          }),
      );
    renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { account: createFundedAccountForViews('1000') },
    });
    await openMarginModeSheet(false);
    fireEvent.changeText(screen.getByTestId(formIds.SIZE_INPUT), '100');

    await waitFor(() =>
      expect(
        Engine.context.PerpsController.getMarginModeLock,
      ).toHaveBeenCalled(),
    );
    expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled();
    expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeDisabled();
    await act(async () =>
      resolveLock({ status: 'unlocked', providerId: 'hyperliquid' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    await waitFor(
      () =>
        expect(screen.getByTestId(formIds.PLACE_ORDER_BUTTON)).toBeEnabled(),
      { timeout: 5000 },
    );
    expect(Engine.context.PerpsController.placeOrder).not.toHaveBeenCalled();
  });

  it('keeps Cross unavailable until market restrictions arrive', async () => {
    let resolveMarkets: (markets: MarketInfo[]) => void = () => undefined;
    const pendingMarkets = new Promise<MarketInfo[]>((resolve) => {
      resolveMarkets = resolve;
    });
    jest
      .mocked(Engine.context.PerpsController.getMarkets)
      .mockReturnValue(pendingMarkets);
    renderPerpsCrossMarginOrderFormPanel();
    await waitFor(() =>
      expect(Engine.context.PerpsController.getMarkets).toHaveBeenCalled(),
    );

    fireEvent.press(await screen.findByTestId(formIds.MARGIN_MODE_BUTTON));
    expect(await screen.findByTestId(marginIds.CROSS_OPTION)).toBeDisabled();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    expect(screen.getByTestId(marginIds.CONTAINER)).toBeOnTheScreen();
    await act(async () => resolveMarkets([crossMarginMarketInfo]));

    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
  });
});
