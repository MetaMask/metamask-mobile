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
import { createAccountSwitcher } from '../../../../../../../tests/component-view/helpers/accountSwitcher';
import {
  crossMarginMarketInfo,
  goBackFromCrossMarginSheet,
  openMarginModeSheet,
  pressMarginModeOption,
  resetMarginModeControllerMocks,
  selectCrossMarginMode,
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
  PerpsCrossMarginConfirmBottomSheetSelectorsIDs as confirmIds,
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
  { name: 'Lighter market', market: { providerId: 'lighter' } },
  { name: 'isolated-only asset', metadata: { onlyIsolated: true } },
  { name: 'noCross asset', metadata: { marginMode: 'noCross' } },
  { name: 'strictIsolated asset', metadata: { marginMode: 'strictIsolated' } },
  {
    name: 'noCross HIP-3 market',
    market: { marketSource: 'xyz' },
    metadata: { marginMode: 'noCross' },
  },
  {
    name: 'strictIsolated HIP-3 market',
    market: { marketSource: 'xyz' },
    metadata: { marginMode: 'strictIsolated' },
  },
  {
    name: 'Lighter market on the Terminal backend',
    terminal: true,
    market: { providerId: 'lighter' },
  },
];

const terminalBackendFlags = (enabled: boolean) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsTerminalBackendEnabled: { enabled, minimumVersion: '0.0.0' },
        },
      },
    },
  },
});

const SECOND_ACCOUNT_ID = 'cross-margin-second-account';
const SECOND_ACCOUNT = '0x0000000000000000000000000000000000000002';

const getSelectedAccount = (
  store: ReturnType<typeof renderPerpsCrossMarginOrderFormPanel>['store'],
) => {
  const { accounts, selectedAccount } =
    store.getState().engine.backgroundState.AccountsController.internalAccounts;
  return { id: selectedAccount, address: accounts[selectedAccount].address };
};

async function expectCrossSelectedWithoutConfirmation() {
  await waitFor(() =>
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    ),
  );
  expect(screen.queryByTestId(confirmIds.CONTAINER)).not.toBeOnTheScreen();
}

describeForPlatforms('PerpsProOrderFormPanel Cross orders', () => {
  let unwire: (() => void) | undefined;
  let restoreAccount: (() => void) | undefined;
  beforeEach(resetMarginModeControllerMocks);

  it('starts a market with no saved margin mode on Isolated', async () => {
    renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { positions: [] },
    });

    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.isolated_title'),
      ),
    );
  });

  it('shows the saved Cross margin mode when the next ticket has no position', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        positions: [],
        account: createFundedAccountForViews('1000'),
      },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              tradeConfigurations: {
                mainnet: {
                  hyperliquid: {
                    ETH: { marginMode: 'cross' },
                  },
                },
              },
            },
          },
        },
      },
    });
    unwire = wirePerpsControllerForStore(store);

    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
  });

  it('keeps Cross after the order ticket is reopened', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        positions: [],
        account: createFundedAccountForViews('1000'),
      },
    });
    unwire = wirePerpsControllerForStore(store);
    await openMarginModeSheet();
    await selectCrossMarginMode();
    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
    const savedConfigurations =
      store.getState().engine.backgroundState.PerpsController
        .tradeConfigurations;

    cleanup();
    unwire();
    unwire = undefined;

    const remounted = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        positions: [],
        account: createFundedAccountForViews('1000'),
      },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              tradeConfigurations: savedConfigurations,
            },
          },
        },
      },
    });
    unwire = wirePerpsControllerForStore(remounted.store);

    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
  });
  afterEach(() => {
    cleanup();
    unwire?.();
    unwire = undefined;
    restoreAccount?.();
    restoreAccount = undefined;
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
    jest
      .mocked(Engine.context.PerpsController.previewPositionModify)
      .mockResolvedValue(isolatedPreview);
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
    // The Pro form keeps the before→after preview off for held Cross
    // positions, so none is requested and the isolated one is not retained.
    expect(
      Engine.context.PerpsController.previewPositionModify,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ position: crossPosition }),
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
  });

  it('selects Cross, updates the form and submits the chosen mode on the Terminal backend', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { account: createFundedAccountForViews('1000') },
      overrides: terminalBackendFlags(true),
    });
    unwire = wirePerpsControllerForStore(store);
    await openMarginModeSheet();
    await selectCrossMarginMode();
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
    await selectCrossMarginMode();

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

  it('asks for the Cross confirmation only on the first Cross selection', async () => {
    renderPerpsCrossMarginOrderFormPanel();
    await openMarginModeSheet();
    await selectCrossMarginMode();

    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.ISOLATED_OPTION);

    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);

    await expectCrossSelectedWithoutConfirmation();
  });

  it('reopens the Cross confirmation when the user goes back instead of confirming', async () => {
    renderPerpsCrossMarginOrderFormPanel();
    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);
    await goBackFromCrossMarginSheet();
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.pro_order_form.isolated'),
    );

    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);

    await screen.findByTestId(confirmIds.CONTAINER);
  });

  it('keeps the Cross confirmation separate for each account', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel();
    const accountSwitcher = createAccountSwitcher(store);
    restoreAccount = accountSwitcher.cleanup;
    const firstAccount = getSelectedAccount(store);
    await openMarginModeSheet();
    await selectCrossMarginMode();
    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.ISOLATED_OPTION);

    act(() => accountSwitcher.switchTo(SECOND_ACCOUNT_ID, SECOND_ACCOUNT));
    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);
    await goBackFromCrossMarginSheet();
    act(() => accountSwitcher.switchTo(firstAccount.id, firstAccount.address));
    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);

    await expectCrossSelectedWithoutConfirmation();
  });

  it('closes the Cross confirmation without selecting Cross when the account changes', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel();
    const accountSwitcher = createAccountSwitcher(store);
    restoreAccount = accountSwitcher.cleanup;
    await openMarginModeSheet();
    await pressMarginModeOption(marginIds.CROSS_OPTION);
    await screen.findByTestId(confirmIds.CONTAINER);

    act(() => accountSwitcher.switchTo(SECOND_ACCOUNT_ID, SECOND_ACCOUNT));

    await waitFor(() =>
      expect(screen.queryByTestId(confirmIds.CONTAINER)).not.toBeOnTheScreen(),
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
    await selectCrossMarginMode();
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
    await selectCrossMarginMode();
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
  });

  it('forgets the selected Cross mode after the Perps network changes', async () => {
    const { store } = renderPerpsCrossMarginOrderFormPanel();
    const controllerState = createPerpsControllerStateHarness(store);
    unwire = controllerState.cleanup;
    await openMarginModeSheet();
    await selectCrossMarginMode();
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

  it.each([
    { name: 'HIP-3 market', terminal: false },
    { name: 'HIP-3 market on the Terminal backend', terminal: true },
  ])(
    'offers Cross on an XYZ $name whose venue metadata permits it',
    async ({ terminal }) => {
      jest
        .mocked(Engine.context.PerpsController.getMarkets)
        .mockResolvedValue([{ ...crossMarginMarketInfo }]);
      const market = createEthMarketForViews({ marketSource: 'xyz' });
      renderPerpsCrossMarginOrderFormPanel({
        crossMarginEnabled: true,
        initialParams: { market },
        streamOverrides: { marketData: [market] },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsTerminalBackendEnabled: {
                    enabled: terminal,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });

      await openMarginModeSheet();
      await selectCrossMarginMode();

      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      );
    },
  );

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

  it('keeps Cross unavailable on the Terminal backend when only the venue reports an isolated-only asset', async () => {
    // Terminal market lists carry no margin restriction; the venue read
    // (skipFilters) does.
    jest
      .mocked(Engine.context.PerpsController.getMarkets)
      .mockImplementation(async (params) => [
        params?.skipFilters
          ? { ...crossMarginMarketInfo, onlyIsolated: true }
          : crossMarginMarketInfo,
      ]);
    renderPerpsCrossMarginOrderFormPanel({
      overrides: terminalBackendFlags(true),
    });

    await openMarginModeSheet();
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

    expect(Engine.context.PerpsController.getMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ skipFilters: true }),
    );
    expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled();
    expect(
      screen.getByText(strings('perps.margin_mode.cross_description')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.pro_order_form.isolated'),
    );
    // An unresolved key renders `[missing "en.<key>" translation]` on both sides.
    expect(screen.queryAllByText(/\[missing/iu)).toHaveLength(0);
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
    await selectCrossMarginMode();
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

    await selectCrossMarginMode();
    await waitFor(() =>
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings('perps.margin_mode.cross_title'),
      ),
    );
  });
});
