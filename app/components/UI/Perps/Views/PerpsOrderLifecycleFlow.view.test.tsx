/**
 * Order Lifecycle & Funds Flow — E2E-like view test.
 *
 * Simulates a trader going through the order lifecycle: closing a position,
 * reviewing the order book, checking order details (valid and missing),
 * viewing PnL on the hero card, withdrawing funds, and selecting a
 * trading provider.
 *
 * Components covered: PerpsClosePositionView, PerpsOrderBookView,
 * PerpsOrderDetailsView, PerpsHeroCardView, PerpsWithdrawView,
 * PerpsSelectProviderView
 */
import '../../../../../tests/component-view/mocks';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsClosePositionView,
  renderPerpsOrderBookView,
  renderPerpsOrderDetailsView,
  renderPerpsHeroCardView,
  renderPerpsWithdrawView,
  renderPerpsSelectProviderView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderBookViewSelectorsIDs,
  PerpsHeroCardViewSelectorsIDs,
  PerpsWithdrawViewSelectorsIDs,
} from '../Perps.testIds';

const myxEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsMyxProviderEnabled: {
            enabled: true,
            featureVersion: null,
            minimumVersion: '0.0.0',
          },
        },
      },
    },
  },
};

describe('Order Lifecycle & Funds Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trader closes position, reviews order book, checks order details, views PnL, withdraws, and switches provider', async () => {
    // ── PHASE 1: Close position ──────────────────────────────────────────
    // Trader opens the close position screen — order header renders
    renderPerpsClosePositionView();
    expect(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.HEADER,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 2: Order book ──────────────────────────────────────────────
    // Trader reviews the order book for market depth
    cleanup();
    renderPerpsOrderBookView();
    expect(
      await screen.findByTestId(
        PerpsOrderBookViewSelectorsIDs.CONTAINER,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 3: Order details — valid order and missing order ───────────
    // Trader views details for an existing ETH order
    cleanup();
    renderPerpsOrderDetailsView();
    expect(
      await screen.findByText('ETH', {}, { timeout: 10000 }),
    ).toBeOnTheScreen();

    // Trader navigates to a missing order — error message appears
    cleanup();
    renderPerpsOrderDetailsView({ initialParams: { order: undefined } });
    expect(
      await screen.findByText(
        strings('perps.errors.order_not_found'),
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 4: PnL hero card ──────────────────────────────────────────
    // Trader views the PnL hero card for a position
    cleanup();
    renderPerpsHeroCardView();
    expect(
      await screen.findByTestId(
        PerpsHeroCardViewSelectorsIDs.CONTAINER,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 5: Withdraw funds ──────────────────────────────────────────
    // Trader opens withdrawal screen — back button present
    cleanup();
    renderPerpsWithdrawView();
    expect(
      await screen.findByTestId(
        PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 6: Provider selection ──────────────────────────────────────
    // Trader opens provider selector — sheet with title and HyperLiquid
    cleanup();
    renderPerpsSelectProviderView();
    expect(
      await screen.findByTestId('perps-select-provider-sheet'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.provider_selector.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-select-provider-sheet-option-hyperliquid'),
    ).toBeOnTheScreen();
    // MYX option hidden when feature flag is disabled
    expect(
      screen.queryByTestId('perps-select-provider-sheet-option-myx'),
    ).not.toBeOnTheScreen();

    // With MYX enabled + aggregated provider → HyperLiquid shows selected
    cleanup();
    renderPerpsSelectProviderView({
      overrides: {
        ...myxEnabledOverrides,
        engine: {
          backgroundState: {
            ...myxEnabledOverrides.engine.backgroundState,
            PerpsController: { activeProvider: 'aggregated' },
          },
        },
      },
    });
    expect(
      await screen.findByTestId(
        'perps-select-provider-sheet-check-hyperliquid',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('perps-select-provider-sheet-check-myx'),
    ).not.toBeOnTheScreen();

    // Trader selects MYX provider — switchProvider is called
    cleanup();
    const switchProviderMock = Engine.context.PerpsController
      .switchProvider as jest.Mock;
    renderPerpsSelectProviderView({ overrides: myxEnabledOverrides });
    const myxOption = await screen.findByTestId(
      'perps-select-provider-sheet-option-myx',
    );
    fireEvent.press(myxOption);
    await waitFor(() => {
      expect(switchProviderMock).toHaveBeenCalledWith('myx');
    });
  });
});
