import '../../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { MarketInfo, PerpsMarketData } from '@metamask/perps-controller';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  crossMarginMarketInfo,
  openMarginModeSheet,
  resetMarginModeControllerMocks,
} from '../../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import { wirePerpsControllerForStore } from '../../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import {
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsProOrderFormSelectorsIDs as formIds,
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
