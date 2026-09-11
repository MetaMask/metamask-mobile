/**
 * Position Close Flow — CV-equivalent of the perps-position.spec.ts Appium E2E tests.
 *
 * Covers the full close journey across two entry points:
 *   Lite: position on market details → press Close → ClosePositionView →
 *         confirm → stream delivers closure → close button gone
 *   Pro:  position row in Pro panel → press close icon → ClosePositionView →
 *         confirm → stream delivers closure → position row gone
 *
 * The E2E tests require a real device to boot and place a live order before
 * closing it.  These CV tests skip the order-placement step by seeding the
 * position directly into the stream, making the meaningful invariant — that
 * the close journey completes and the UI reflects the closed state — fully
 * exercisable without a device.
 *
 * Components covered (cross-screen): PerpsMarketDetailsView,
 * PerpsProMarketView, PerpsClosePositionView
 */
import '../../../../../tests/component-view/mocks';

import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { PriceUpdate } from '@metamask/perps-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  renderPerpsMarketDetailsView,
  renderPerpsProMarketView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../../../tests/component-view/platform';
import {
  PerpsClosePositionViewSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  getPerpsProPositionRowSelector,
} from '../Perps.testIds';
import PerpsClosePositionView from './PerpsClosePositionView/PerpsClosePositionView';
import { clearPendingPerpsCufTraces } from '../utils/perpsCufTrace';

const TIMEOUT_MS = 5000;

const ethMarket = createEthMarketForViews();
const ethLong = createLongPositionForViews({
  entryPrice: '2400',
  unrealizedPnl: '100',
  returnOnEquity: '0.12',
});

const ethPrices: Record<string, PriceUpdate> = {
  ETH: {
    symbol: 'ETH',
    price: '2500',
    markPrice: '2500',
    percentChange24h: '2',
    timestamp: 1,
    isTradable: true,
  },
};

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

/**
 * Drain microtasks and pending timers so fire-and-forget toast/haptic work
 * finishes before Jest tears down the test environment.
 */
const flushAsyncSideEffects = async (delayMs = 50) => {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  });
};

describeForPlatforms('Position Close Flow', () => {
  afterEach(async () => {
    clearPendingPerpsCufTraces();
    await flushAsyncSideEffects();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Lite flow: PerpsMarketDetailsView → PerpsClosePositionView
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'eligible user presses Close on market details, confirms close, and position disappears after stream update',
    async () => {
      const closePosition = Engine.context.PerpsController
        .closePosition as jest.Mock;
      closePosition.mockClear();
      closePosition.mockResolvedValue({ success: true });

      const { stream } = renderPerpsMarketDetailsView({
        overrides: eligibleOverrides,
        initialParams: { market: ethMarket },
        streamOverrides: {
          account: createFundedAccountForViews('10000'),
          positions: [ethLong],
          orders: [],
          marketData: [ethMarket],
        },
        extraRoutes: [
          {
            name: Routes.PERPS.CLOSE_POSITION,
            Component:
              PerpsClosePositionView as unknown as React.ComponentType<unknown>,
          },
        ],
      });

      // ── Arrange: close button visible on market details ──────────────────
      const closeButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );
      expect(closeButton).toBeOnTheScreen();

      // ── Act 1: press Close → navigate to PerpsClosePositionView ─────────
      fireEvent.press(closeButton);

      // Wait for close position screen to appear
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );

      // Deliver live price so fee calculation can complete and enable the
      // confirm button
      act(() => {
        stream.emitPrices(ethPrices);
      });

      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
            ),
          ).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );

      // ── Act 2: confirm close ─────────────────────────────────────────────
      // ClosePositionView calls navigation.goBack() synchronously before
      // dispatching closePosition asynchronously.
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        );
      });

      // ── Assert 1: back on market details, close button still visible ─────
      // Position stream hasn't been cleared yet — the backend hasn't confirmed.
      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      // closePosition must have been invoked with the correct params
      await waitFor(
        () => {
          expect(closePosition).toHaveBeenCalledWith(
            expect.objectContaining({
              orderType: 'market',
              position: expect.objectContaining({ symbol: 'ETH' }),
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );

      // ── Act 3: stream delivers the confirmed closure ──────────────────────
      act(() => {
        stream.emitPositions([]);
      });

      // ── Assert 2: close button gone — position is now closed ─────────────
      await waitFor(
        () => {
          expect(
            screen.queryByTestId(
              PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
            ),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Pro flow: PerpsProMarketView → PerpsClosePositionView
  // ─────────────────────────────────────────────────────────────────────────

  itForPlatforms(
    'eligible user closes a position from the Pro positions panel, confirms, and position row disappears after stream update',
    async () => {
      const closePosition = Engine.context.PerpsController
        .closePosition as jest.Mock;
      closePosition.mockClear();
      closePosition.mockResolvedValue({ success: true });

      const { stream } = renderPerpsProMarketView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('10000'),
          marketData: [ethMarket],
          prices: ethPrices,
          positions: [ethLong],
          orders: [],
        },
        extraRoutes: [
          {
            name: Routes.PERPS.CLOSE_POSITION,
            Component:
              PerpsClosePositionView as unknown as React.ComponentType<unknown>,
          },
        ],
      });

      // ── Arrange: positions panel with ETH row ────────────────────────────
      await screen.findByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL,
        {},
        { timeout: TIMEOUT_MS },
      );

      const ethRow = await screen.findByTestId(
        getPerpsProPositionRowSelector('ETH'),
        {},
        { timeout: TIMEOUT_MS },
      );
      expect(ethRow).toBeOnTheScreen();

      // ── Act 1: press close icon on position row → navigate to close screen ──
      fireEvent.press(
        within(ethRow).getByTestId(
          PerpsProMarketViewSelectorsIDs.POSITION_CLOSE,
        ),
      );

      // Wait for close position screen
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );

      // Prices were seeded via streamOverrides; top-up to trigger fee recalc
      act(() => {
        stream.emitPrices(ethPrices);
      });

      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
            ),
          ).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );

      // ── Act 2: confirm close ─────────────────────────────────────────────
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        );
      });

      // closePosition invoked with the correct symbol
      await waitFor(
        () => {
          expect(closePosition).toHaveBeenCalledWith(
            expect.objectContaining({
              orderType: 'market',
              position: expect.objectContaining({ symbol: 'ETH' }),
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );

      // ── Act 3: stream delivers the confirmed closure ──────────────────────
      act(() => {
        stream.emitPositions([]);
      });

      // ── Assert: ETH position row gone from the Pro panel ─────────────────
      await waitFor(
        () => {
          expect(
            screen.queryByTestId(getPerpsProPositionRowSelector('ETH')),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );
});
