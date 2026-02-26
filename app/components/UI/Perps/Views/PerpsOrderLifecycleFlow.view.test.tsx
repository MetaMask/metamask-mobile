/**
 * Order Lifecycle & Funds Flow — E2E-like view test.
 *
 * Simulates a trader going through the order lifecycle: closing a position,
 * reviewing the order book, checking order details (valid and missing),
 * viewing PnL on the hero card, withdrawing funds, selecting a trading
 * provider, choosing order type, reviewing quote details, handling quote
 * expiration, and adjusting margin on a position.
 *
 * Components covered: PerpsClosePositionView, PerpsOrderBookView,
 * PerpsOrderDetailsView, PerpsHeroCardView, PerpsWithdrawView,
 * PerpsSelectProviderView, PerpsOrderTypeBottomSheet,
 * PerpsQuoteDetailsCard, PerpsQuoteExpiredModal, PerpsAdjustMarginView,
 * PerpsTransactionsView, PerpsSelectOrderTypeView
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  renderPerpsClosePositionView,
  renderPerpsOrderBookView,
  renderPerpsOrderDetailsView,
  renderPerpsHeroCardView,
  renderPerpsWithdrawView,
  renderPerpsSelectProviderView,
  renderPerpsView,
  renderPerpsComponent,
  renderPerpsTransactionsView,
  defaultPositionForViews,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderBookViewSelectorsIDs,
  PerpsHeroCardViewSelectorsIDs,
  PerpsWithdrawViewSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../Perps.testIds';
import PerpsOrderTypeBottomSheet from '../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheet';
import PerpsQuoteDetailsCard from '../components/PerpsQuoteDetailsCard/PerpsQuoteDetailsCard';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal/PerpsQuoteExpiredModal';
import PerpsAdjustMarginView from './PerpsAdjustMarginView/PerpsAdjustMarginView';
import PerpsSelectOrderTypeView from './PerpsSelectOrderTypeView/PerpsSelectOrderTypeView';

/** Shorter timeout so tests fail fast; 3s is enough for component render. */
const TIMEOUT_MS = 3000;

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
  let ORDER_TYPE_TITLE: string;
  let ORDER_TYPE_MARKET: string;
  let ORDER_TYPE_LIMIT: string;
  let QUOTE_NETWORK_FEE: string;
  let QUOTE_ESTIMATED_TIME: string;
  let QUOTE_RATE: string;
  let DONE_BUTTON: string;
  let LIQUIDATION_PRICE: string;

  beforeAll(() => {
    ORDER_TYPE_TITLE = strings('perps.order.type.title');
    ORDER_TYPE_MARKET = strings('perps.order.type.market.title');
    ORDER_TYPE_LIMIT = strings('perps.order.type.limit.title');
    QUOTE_NETWORK_FEE = strings('perps.quote.network_fee');
    QUOTE_ESTIMATED_TIME = strings('perps.quote.estimated_time');
    QUOTE_RATE = strings('perps.quote.rate');
    DONE_BUTTON = strings('perps.deposit.done_button');
    LIQUIDATION_PRICE = strings('perps.adjust_margin.liquidation_price');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trader closes position, reviews order book, checks order details, views PnL, withdraws, and switches provider', async () => {
    // ── PHASE 1: Close position — toggle display and interact with buttons ─
    renderPerpsClosePositionView();
    expect(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.HEADER,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    // Trader presses the display toggle button to switch USD/token view
    const displayToggle = screen.queryByTestId(
      PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
    );
    if (displayToggle) {
      fireEvent.press(displayToggle);
    }
    // Trader presses the fees tooltip to learn about fees
    const feesTooltip = screen.queryByTestId(
      PerpsClosePositionViewSelectorsIDs.FEES_TOOLTIP_BUTTON,
    );
    if (feesTooltip) {
      fireEvent.press(feesTooltip);
    }

    // ── PHASE 2: Order book ──────────────────────────────────────────────
    cleanup();
    renderPerpsOrderBookView();
    expect(
      await screen.findByTestId(
        PerpsOrderBookViewSelectorsIDs.CONTAINER,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 3: Order details — valid order and missing order ───────────
    cleanup();
    renderPerpsOrderDetailsView();
    expect(
      await screen.findByText('ETH', {}, { timeout: TIMEOUT_MS }),
    ).toBeOnTheScreen();

    // Trader navigates to a missing order — error message appears
    cleanup();
    renderPerpsOrderDetailsView({ initialParams: { order: undefined } });
    expect(
      await screen.findByText(
        strings('perps.errors.order_not_found'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 4: PnL hero card ──────────────────────────────────────────
    cleanup();
    renderPerpsHeroCardView();
    expect(
      await screen.findByTestId(
        PerpsHeroCardViewSelectorsIDs.CONTAINER,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 5: Withdraw funds — press back button ──────────────────────
    cleanup();
    renderPerpsWithdrawView();
    const withdrawBackButton = await screen.findByTestId(
      PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );
    expect(withdrawBackButton).toBeOnTheScreen();
    fireEvent.press(withdrawBackButton);

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

    // ── PHASE 7: Order type selection ────────────────────────────────────
    // Trader opens order type bottom sheet — Market and Limit options visible
    cleanup();
    const mockOnSelect = jest.fn();
    const OrderTypeMarketWrapper: React.FC = () => (
      <PerpsOrderTypeBottomSheet
        isVisible
        onClose={jest.fn()}
        onSelect={mockOnSelect}
        currentOrderType="market"
        asset="ETH"
        direction="long"
      />
    );
    renderPerpsView(OrderTypeMarketWrapper, 'OrderTypeTest');
    expect(await screen.findByText(ORDER_TYPE_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(ORDER_TYPE_MARKET)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.type.market.description')),
    ).toBeOnTheScreen();
    expect(screen.getByText(ORDER_TYPE_LIMIT)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.type.limit.description')),
    ).toBeOnTheScreen();

    // Trader selects Limit order type — callback fires with 'limit'
    fireEvent.press(screen.getByText(ORDER_TYPE_LIMIT));
    expect(mockOnSelect).toHaveBeenCalledWith('limit');

    // Trader re-opens and selects Market — callback fires with 'market'
    cleanup();
    const mockOnSelectMarket = jest.fn();
    const OrderTypeLimitWrapper: React.FC = () => (
      <PerpsOrderTypeBottomSheet
        isVisible
        onClose={jest.fn()}
        onSelect={mockOnSelectMarket}
        currentOrderType="limit"
        asset="ETH"
        direction="short"
      />
    );
    renderPerpsView(OrderTypeLimitWrapper, 'OrderTypeTest');
    fireEvent.press(await screen.findByText(ORDER_TYPE_MARKET));
    expect(mockOnSelectMarket).toHaveBeenCalledWith('market');

    // Hidden sheet renders nothing
    cleanup();
    const OrderTypeHiddenWrapper: React.FC = () => (
      <PerpsOrderTypeBottomSheet
        isVisible={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    renderPerpsView(OrderTypeHiddenWrapper, 'OrderTypeTest');
    expect(screen.queryByText(ORDER_TYPE_TITLE)).not.toBeOnTheScreen();

    // ── PHASE 8: Review quote details ────────────────────────────────────
    // Trader reviews deposit quote: network fee, MetaMask fee, time, rate
    cleanup();
    renderPerpsComponent(
      PerpsQuoteDetailsCard as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        networkFee: '$1.50',
        estimatedTime: '~2 min',
        rate: '1 USDC = 1 USDC',
        metamaskFee: '$0.00',
        direction: 'deposit',
      },
    );
    expect(await screen.findByText(QUOTE_NETWORK_FEE)).toBeOnTheScreen();
    expect(screen.getByText('$1.50')).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.quote.metamask_fee')),
    ).toBeOnTheScreen();
    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(screen.getByText(QUOTE_ESTIMATED_TIME)).toBeOnTheScreen();
    expect(screen.getByText('~2 min')).toBeOnTheScreen();
    expect(screen.getByText(QUOTE_RATE)).toBeOnTheScreen();
    expect(screen.getByText('1 USDC = 1 USDC')).toBeOnTheScreen();

    // Without estimated time — row is hidden
    cleanup();
    renderPerpsComponent(
      PerpsQuoteDetailsCard as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        networkFee: '$0.50',
        rate: '1 ETH = $2,000',
        direction: 'withdrawal',
      },
    );
    expect(await screen.findByText(QUOTE_NETWORK_FEE)).toBeOnTheScreen();
    expect(screen.queryByText(QUOTE_ESTIMATED_TIME)).not.toBeOnTheScreen();
    expect(screen.getByText(QUOTE_RATE)).toBeOnTheScreen();

    // ── PHASE 9: Quote expired — press "Get new quote" ─────────────────
    cleanup();
    renderPerpsView(
      PerpsQuoteExpiredModal as unknown as React.ComponentType,
      Routes.PERPS.MODALS.QUOTE_EXPIRED_MODAL,
    );
    expect(
      await screen.findByText(
        strings('perps.deposit.quote_expired_modal.title'),
      ),
    ).toBeOnTheScreen();
    const getNewQuoteButton = screen.getByText(
      strings('perps.deposit.quote_expired_modal.get_new_quote'),
    );
    expect(getNewQuoteButton).toBeOnTheScreen();
    fireEvent.press(getNewQuoteButton);

    // ── PHASE 10: Adjust margin — add mode with keypad interaction ───────
    cleanup();
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      {
        initialParams: {
          position: defaultPositionForViews,
          mode: 'add',
        },
        streamOverrides: { positions: [defaultPositionForViews] },
      },
    );
    const addMarginElements = await screen.findAllByText(
      strings('perps.adjust_margin.add_margin'),
    );
    expect(addMarginElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(strings('perps.adjust_margin.margin_in_position')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.margin_available_to_add')),
    ).toBeOnTheScreen();
    expect(screen.getByText(LIQUIDATION_PRICE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.liquidation_distance')),
    ).toBeOnTheScreen();

    // Trader taps the amount display → keypad section appears
    const amountDisplay = screen.getByTestId(
      PerpsAmountDisplaySelectorsIDs.CONTAINER,
    );
    fireEvent.press(amountDisplay);
    expect(screen.getByText(DONE_BUTTON)).toBeOnTheScreen();
    expect(screen.getByText('25%')).toBeOnTheScreen();
    expect(screen.getByText('50%')).toBeOnTheScreen();

    // Trader presses 25% — amount updates
    fireEvent.press(screen.getByText('25%'));

    // Trader presses Done — exits keypad mode
    fireEvent.press(screen.getByText(DONE_BUTTON));

    // ── PHASE 11: Adjust margin — remove mode with interactions ──────────
    cleanup();
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      {
        initialParams: {
          position: defaultPositionForViews,
          mode: 'remove',
        },
        streamOverrides: { positions: [defaultPositionForViews] },
      },
    );
    const removeMarginElements = await screen.findAllByText(
      strings('perps.adjust_margin.reduce_margin'),
    );
    expect(removeMarginElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        strings('perps.adjust_margin.margin_available_to_remove'),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(LIQUIDATION_PRICE)).toBeOnTheScreen();

    // Trader taps amount display to enter a custom remove amount
    fireEvent.press(
      screen.getByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
    );
    fireEvent.press(screen.getByText('50%'));
    fireEvent.press(screen.getByText(DONE_BUTTON));

    // Error state when position/mode missing
    cleanup();
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
    );
    expect(
      await screen.findByText(strings('perps.errors.position_not_found')),
    ).toBeOnTheScreen();

    // ── PHASE 12: Extended withdrawal verification ───────────────────────
    // Trader re-opens withdraw screen — title and labels visible
    cleanup();
    renderPerpsWithdrawView();
    expect(
      await screen.findByTestId(
        PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.withdrawal.title')),
    ).toBeOnTheScreen();

    // ── PHASE 13: Activity / Transactions view ─────────────────────────
    // Trader opens Activity — sees Trades, Orders, Funding, Deposits tabs
    cleanup();
    renderPerpsTransactionsView();
    await screen.findByText(
      strings('perps.transactions.tabs.trades'),
      {},
      {
        timeout: TIMEOUT_MS,
      },
    );
    expect(
      screen.getByText(strings('perps.transactions.tabs.orders')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.transactions.tabs.orders')),
    );
    expect(
      screen.getByText(strings('perps.transactions.tabs.funding')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.transactions.tabs.funding')),
    );
    expect(
      screen.getByText(strings('perps.transactions.tabs.deposits')),
    ).toBeOnTheScreen();

    // ── PHASE 14: Select order type (View wrapper) ───────────────────────
    // Trader opens order type via View — same UI as OrderTypeBottomSheet, with nav
    cleanup();
    renderPerpsView(
      PerpsSelectOrderTypeView as unknown as React.ComponentType,
      Routes.PERPS.SELECT_ORDER_TYPE,
      {
        initialParams: {
          currentOrderType: 'market',
          asset: 'ETH',
          direction: 'long',
        },
      },
    );
    await screen.findByText(ORDER_TYPE_TITLE, {}, { timeout: TIMEOUT_MS });
    expect(screen.getByText(ORDER_TYPE_MARKET)).toBeOnTheScreen();
    expect(screen.getByText(ORDER_TYPE_LIMIT)).toBeOnTheScreen();
    fireEvent.press(screen.getByText(ORDER_TYPE_LIMIT));
  });
});
