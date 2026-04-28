/**
 * Market Browsing & Risk Awareness Flow — E2E-like view test.
 *
 * Simulates a trader encountering loading states, browsing live prices
 * and market rows, viewing recent trades, receiving risk warnings
 * (stop-loss and margin prompts), enabling notifications, and reviewing
 * transaction details.
 *
 * Components covered: PerpsLoader, LivePriceDisplay, PerpsMarketRowItem,
 * PerpsMarketTradesList, PerpsStopLossPromptBanner,
 * PerpsNotificationBottomSheet, PerpsTransactionDetailAssetHero,
 * PerpsMarketSortFieldBottomSheet, PerpsTransactionItem,
 * TradingViewChart, PerpsNotificationTooltip
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsComponent,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsLoaderSelectorsIDs,
  PerpsStopLossPromptSelectorsIDs,
  PerpsTransactionSelectorsIDs,
  TradingViewChartSelectorsIDs,
} from '../Perps.testIds';
import PerpsLoader from '../components/PerpsLoader/PerpsLoader';
import LivePriceDisplay from '../components/LivePriceDisplay/LivePriceDisplay';
import PerpsMarketRowItem from '../components/PerpsMarketRowItem/PerpsMarketRowItem';
import PerpsMarketTradesList from '../components/PerpsMarketTradesList/PerpsMarketTradesList';
import PerpsStopLossPromptBanner from '../components/PerpsStopLossPromptBanner/PerpsStopLossPromptBanner';
import PerpsNotificationBottomSheet from '../components/PerpsNotificationBottomSheet/PerpsNotificationBottomSheet';
import PerpsTransactionDetailAssetHero from '../components/PerpsTransactionDetailAssetHero/PerpsTransactionDetailAssetHero';
import PerpsMarketSortFieldBottomSheet from '../components/PerpsMarketSortFieldBottomSheet/PerpsMarketSortFieldBottomSheet';
import PerpsTransactionItem from '../components/PerpsTransactionItem/PerpsTransactionItem';
import TradingViewChart from '../components/TradingViewChart/TradingViewChart';
import PerpsNotificationTooltip from '../components/PerpsNotificationTooltip/PerpsNotificationTooltip';

const ethMarket = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,000',
  change24h: '+$50',
  change24hPercent: '+2.5%',
  volume: '$1.5B',
};

const btcMarket = {
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '100x',
  price: '$50,000',
  change24h: '-$500',
  change24hPercent: '-1.0%',
  volume: '$3B',
};

const sampleTransaction = {
  id: 'tx_hero_1',
  type: 'trade' as const,
  category: 'position_close' as const,
  title: 'Closed long',
  subtitle: '2.5 ETH',
  timestamp: Date.now(),
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$100',
    amountNumber: 100,
    isPositive: true,
    size: '2.5',
    entryPrice: '2000',
    points: '10',
    pnl: '+$100',
    fee: '$1',
    action: 'close' as const,
    feeToken: 'USDC',
    fillType: 'Standard' as const,
  },
};

const mockStyles = {
  assetContainer: {},
  assetIconContainer: {},
  assetAmount: {},
};

const transactionItemStyles = {
  transactionItem: {},
  tokenIconContainer: {},
  transactionContent: {},
  transactionContentCentered: {},
  transactionTitle: {},
  transactionTitleCentered: {},
  transactionSubtitle: {},
  rightContent: {},
  fillTag: {},
};

describe('Market Browsing & Risk Awareness Flow', () => {
  let NOTIFICATIONS_TITLE: string;
  let SORT_SORT_BY: string;
  let SORT_APPLY: string;

  beforeAll(() => {
    NOTIFICATIONS_TITLE = strings('perps.tooltips.notifications.title');
    SORT_SORT_BY = strings('perps.sort.sort_by');
    SORT_APPLY = strings('perps.sort.apply');
  });

  it('trader sees loading, browses markets, checks risk warnings, enables notifications, and reviews transactions', async () => {
    // ── PHASE 1: Loading states ──────────────────────────────────────────
    // Trader opens Perps and sees fullscreen loader with default message
    renderPerpsComponent(
      PerpsLoader as unknown as React.ComponentType<Record<string, unknown>>,
      { fullScreen: true },
    );
    expect(
      await screen.findByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsLoaderSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(PerpsLoaderSelectorsIDs.TEXT)).toBeOnTheScreen();
    expect(screen.getByText('Connecting to Perps...')).toBeOnTheScreen();

    // Inline loader with custom message
    cleanup();
    renderPerpsComponent(
      PerpsLoader as unknown as React.ComponentType<Record<string, unknown>>,
      { fullScreen: false, message: 'Loading positions...' },
    );
    expect(
      await screen.findByTestId(PerpsLoaderSelectorsIDs.INLINE),
    ).toBeOnTheScreen();
    expect(screen.getByText('Loading positions...')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN),
    ).not.toBeOnTheScreen();

    // ── PHASE 2: Live price display ──────────────────────────────────────
    // No live data available from stream → shows "--" placeholder
    cleanup();
    const LivePriceWrapper: React.FC = () => (
      <LivePriceDisplay symbol="ETH" testID="live-price-eth" />
    );
    renderPerpsView(LivePriceWrapper, 'LivePriceTest');
    expect(await screen.findByTestId('live-price-eth')).toBeOnTheScreen();
    expect(screen.getByText('--')).toBeOnTheScreen();

    // ── PHASE 3: Market row items ────────────────────────────────────────
    // Trader sees ETH market row: symbol, price, change, volume
    cleanup();
    const mockOnPress = jest.fn();
    renderPerpsComponent(
      PerpsMarketRowItem as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      { market: ethMarket, onPress: mockOnPress },
    );
    expect(await screen.findByText('ETH')).toBeOnTheScreen();
    expect(screen.getByText('$2,000')).toBeOnTheScreen();
    expect(screen.getByText('+2.5%')).toBeOnTheScreen();

    // Trader taps the market row
    fireEvent.press(screen.getByText('ETH'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);

    // Trader sees BTC market row with negative change
    cleanup();
    renderPerpsComponent(
      PerpsMarketRowItem as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      { market: btcMarket },
    );
    expect(await screen.findByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('$50,000')).toBeOnTheScreen();
    expect(screen.getByText('-1.0%')).toBeOnTheScreen();

    // ── PHASE 4: Recent trades list ──────────────────────────────────────
    // Trader views recent trades section — header visible, presses "See all"
    cleanup();
    const TradesListWrapper: React.FC = () => (
      <PerpsMarketTradesList symbol="ETH" />
    );
    renderPerpsView(TradesListWrapper, 'TradesListTest');
    expect(
      await screen.findByText(strings('perps.market.recent_trades')),
    ).toBeOnTheScreen();
    // Trader presses "See all" to view full trade history
    const seeAllButton = screen.queryByTestId('see-all-button');
    if (seeAllButton) {
      fireEvent.press(seeAllButton);
    }

    // ── PHASE 5: Stop-loss prompt — add margin variant ───────────────────
    // Trader's position is near liquidation — add margin prompt appears
    cleanup();
    const mockOnAddMargin = jest.fn();
    renderPerpsComponent(
      PerpsStopLossPromptBanner as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        variant: 'add_margin',
        liquidationDistance: 3,
        onAddMargin: mockOnAddMargin,
      },
    );
    expect(
      await screen.findByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.stop_loss_prompt.near_liquidation_subtitle'),
      ),
    ).toBeOnTheScreen();
    const addMarginButton = screen.getByTestId(
      PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON,
    );
    fireEvent.press(addMarginButton);
    expect(mockOnAddMargin).toHaveBeenCalledTimes(1);

    // Stop-loss variant — set stop loss prompt
    cleanup();
    const mockOnSetStopLoss = jest.fn();
    renderPerpsComponent(
      PerpsStopLossPromptBanner as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        variant: 'stop_loss',
        liquidationDistance: 15,
        suggestedStopLossPrice: '45000',
        suggestedStopLossPercent: -50,
        onSetStopLoss: mockOnSetStopLoss,
      },
    );
    expect(
      await screen.findByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.stop_loss_prompt.protect_losses_title')),
    ).toBeOnTheScreen();
    const setStopLossButton = screen.getByTestId(
      PerpsStopLossPromptSelectorsIDs.SET_STOP_LOSS_BUTTON,
    );
    fireEvent.press(setStopLossButton);
    expect(mockOnSetStopLoss).toHaveBeenCalledTimes(1);

    // Stop-loss in loading state — button shows spinner, not label
    cleanup();
    renderPerpsComponent(
      PerpsStopLossPromptBanner as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        variant: 'stop_loss',
        liquidationDistance: 15,
        suggestedStopLossPrice: '45000',
        suggestedStopLossPercent: -50,
        onSetStopLoss: jest.fn(),
        isLoading: true,
      },
    );
    expect(
      await screen.findByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsStopLossPromptSelectorsIDs.LOADING),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.stop_loss_prompt.set_button')),
    ).not.toBeOnTheScreen();

    // Stop-loss success state — button shows check icon
    cleanup();
    renderPerpsComponent(
      PerpsStopLossPromptBanner as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        variant: 'stop_loss',
        liquidationDistance: 15,
        suggestedStopLossPrice: '45000',
        suggestedStopLossPercent: -50,
        onSetStopLoss: jest.fn(),
        isSuccess: true,
      },
    );
    expect(
      await screen.findByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsStopLossPromptSelectorsIDs.SUCCESS_ICON),
    ).toBeOnTheScreen();

    // ── PHASE 6: Notification prompt ─────────────────────────────────────
    // Trader sees notification bottom sheet: title, description, turn on
    cleanup();
    const mockOnClose = jest.fn();
    const NotificationWrapper: React.FC = () => (
      <PerpsNotificationBottomSheet
        isVisible
        onClose={mockOnClose}
        testID="perps-notification-sheet"
      />
    );
    renderPerpsView(NotificationWrapper, 'NotificationTest');
    expect(await screen.findByText(NOTIFICATIONS_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.notifications.description')),
    ).toBeOnTheScreen();
    const turnOnButton = screen.getByText(
      strings('perps.tooltips.notifications.turn_on_button'),
    );
    expect(turnOnButton).toBeOnTheScreen();
    // Trader presses "Turn on" to enable notifications
    fireEvent.press(turnOnButton);

    // Hidden notification sheet renders nothing
    cleanup();
    const NotificationHiddenWrapper: React.FC = () => (
      <PerpsNotificationBottomSheet
        isVisible={false}
        onClose={jest.fn()}
        testID="perps-notification-sheet"
      />
    );
    renderPerpsView(NotificationHiddenWrapper, 'NotificationTest');
    expect(screen.queryByText(NOTIFICATIONS_TITLE)).not.toBeOnTheScreen();

    // ── PHASE 7: Transaction detail asset hero ───────────────────────────
    // Trader opens a closed position transaction — asset icon and subtitle
    cleanup();
    renderPerpsComponent(
      PerpsTransactionDetailAssetHero as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      { transaction: sampleTransaction, styles: mockStyles },
    );
    expect(
      await screen.findByTestId(
        PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTransactionSelectorsIDs.ASSET_ICON_CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('2.5 ETH')).toBeOnTheScreen();

    // ── PHASE 8: Market sort field bottom sheet ───────────────────────────
    cleanup();
    const mockOnOptionSelect = jest.fn();
    const mockOnCloseSort = jest.fn();
    renderPerpsComponent(
      PerpsMarketSortFieldBottomSheet as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        isVisible: true,
        onClose: mockOnCloseSort,
        selectedOptionId: 'priceChange',
        sortDirection: 'desc',
        onOptionSelect: mockOnOptionSelect,
        testID: 'perps-sort-sheet',
      },
    );
    await screen.findByText(SORT_SORT_BY, {}, { timeout: 3000 });
    expect(screen.getByText(SORT_APPLY)).toBeOnTheScreen();
    const volumeOption = screen.getByTestId('perps-sort-sheet-option-volume');
    fireEvent.press(volumeOption);
    fireEvent.press(screen.getByText(SORT_APPLY));
    expect(mockOnOptionSelect).toHaveBeenCalled();

    // ── PHASE 9: Transaction list item ───────────────────────────────────
    cleanup();
    const mockOnPressItem = jest.fn();
    renderPerpsComponent(
      PerpsTransactionItem as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        item: sampleTransaction,
        styles: transactionItemStyles,
        onPress: mockOnPressItem,
        renderRightContent: () => null,
      },
    );
    expect(
      await screen.findByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_ITEM),
    ).toBeOnTheScreen();
    expect(screen.getByText('Closed long')).toBeOnTheScreen();
    expect(screen.getByText('2.5 ETH')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Closed long'));
    expect(mockOnPressItem).toHaveBeenCalledWith(sampleTransaction);

    // ── PHASE 10: TradingView chart container ──────────────────────────────
    cleanup();
    renderPerpsComponent(
      TradingViewChart as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      { height: 200, candleData: null },
    );
    expect(
      await screen.findByTestId(
        TradingViewChartSelectorsIDs.CONTAINER,
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();

    // ── PHASE 11: Notification tooltip (no sheet when orderSuccess false) ─
    cleanup();
    const NotificationTooltipWrapper: React.FC = () => (
      <PerpsNotificationTooltip orderSuccess={false} onComplete={jest.fn()} />
    );
    renderPerpsView(NotificationTooltipWrapper, 'NotificationTooltipTest');
    expect(screen.queryByText(NOTIFICATIONS_TITLE)).not.toBeOnTheScreen();
  });
});
