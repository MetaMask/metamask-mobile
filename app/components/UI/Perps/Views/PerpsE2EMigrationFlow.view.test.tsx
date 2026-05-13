/**
 * Perps E2E -> Component View migration coverage.
 *
 * Mirrors the six Perps smoke specs selected for CV migration while keeping
 * protocol matching/liquidation mechanics represented as stream state changes.
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type {
  AccountState,
  Order,
  PerpsMarketData,
  Position,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { strings } from '../../../../../locales/i18n';
import {
  defaultOrderForViews,
  defaultPositionForViews,
  renderPerpsClosePositionView,
  renderPerpsComponent,
  renderPerpsHomeView,
  renderPerpsMarketDetailsView,
  renderPerpsTPSLView,
  renderPerpsView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsClosePositionViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketTabsSelectorsIDs,
  PerpsOpenOrderCardSelectorsIDs,
  PerpsTPSLViewSelectorsIDs,
  PerpsTutorialSelectorsIDs,
} from '../Perps.testIds';
import PerpsMarketTabs from '../components/PerpsMarketTabs/PerpsMarketTabs';
import PerpsTutorialCarousel from '../components/PerpsTutorialCarousel/PerpsTutorialCarousel';

const TIMEOUT_MS = 5000;

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

const firstTimeOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: true, testnet: true },
      },
    },
  },
};

const fundedAccount = (balance: string): AccountState => ({
  spendableBalance: balance,
  withdrawableBalance: balance,
  totalBalance: balance,
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
});

const ethMarket: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2.0%',
  volume: '$1.5B',
  marketType: 'crypto',
};

const longPosition: Position = {
  ...defaultPositionForViews,
  symbol: 'ETH',
  size: '1',
  marginUsed: '833.33',
  entryPrice: '2500',
  liquidationPrice: '1800',
  unrealizedPnl: '0',
  returnOnEquity: '0',
  leverage: { value: 3, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '0', allTime: '0', sinceChange: '0' },
  positionValue: '2500',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const limitLongOrder: Order = {
  ...defaultOrderForViews,
  orderId: 'limit-eth-mid',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  detailedOrderType: 'Limit',
  price: '2500',
  size: '0.1',
  originalSize: '0.1',
  filledSize: '0',
  remainingSize: '0.1',
  reduceOnly: false,
  status: 'open',
  timestamp: Date.now(),
};

describe('Perps E2E migration flow coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    NavigationService.resetForTesting();
    cleanup();
  });

  it('deposits from Add funds and reflects the updated Perps balance from the account stream', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    const { stream } = renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: fundedAccount('100'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toHaveTextContent('$100');

    fireEvent.press(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(depositWithConfirmation).toHaveBeenCalledWith({
        amount: undefined,
        placeOrder: false,
      });
    });

    act(() => {
      stream.emitAccount(fundedAccount('180'));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toHaveTextContent('$180');
    });
  });

  it('shows an ETH limit long order, then moves it into a position after the fill stream update', async () => {
    const onOrderSelect = jest.fn();

    const { stream } = renderPerpsComponent(
      PerpsMarketTabs as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        symbol: 'ETH',
        initialTab: 'orders',
        onOrderSelect,
      },
      {
        overrides: eligibleOverrides,
        streamOverrides: {
          account: fundedAccount('10000'),
          positions: [],
          orders: [limitLongOrder],
          marketData: [ethMarket],
        },
      },
    );

    expect(
      await screen.findByTestId(
        PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Limit Long')).toBeOnTheScreen();

    const orderCard = screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CARD);
    fireEvent.press(orderCard);
    expect(onOrderSelect).toHaveBeenCalledWith('limit-eth-mid');

    act(() => {
      stream.emitOrders([]);
      stream.emitPositions([
        {
          ...longPosition,
          unrealizedPnl: '-37.50',
          returnOnEquity: '-0.045',
        },
      ]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsOpenOrderCardSelectorsIDs.CARD),
      ).not.toBeOnTheScreen();
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
    ).toBeOnTheScreen();
  });

  it('lets a first-time no-funds trader enter the tutorial and complete it', async () => {
    const navigationDispatch = jest.fn();
    NavigationService.navigation = {
      navigate: jest.fn(),
      dispatch: navigationDispatch,
      reset: jest.fn(),
    } as never;
    const markTutorialCompleted = Engine.context.PerpsController
      .markTutorialCompleted as jest.Mock;

    renderPerpsView(
      PerpsTutorialCarousel as unknown as React.ComponentType,
      Routes.PERPS.TUTORIAL,
      {
        overrides: firstTimeOverrides,
        initialParams: { source: 'component_view' },
        streamOverrides: {
          account: fundedAccount('0'),
          positions: [],
          orders: [],
          marketData: [ethMarket],
        },
      },
    );

    expect(
      await screen.findByText(
        strings('perps.tutorial.what_are_perps.title'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PerpsTutorialSelectorsIDs.SKIP_BUTTON));

    expect(markTutorialCompleted).toHaveBeenCalledTimes(1);
    expect(navigationDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REPLACE' }),
    );
  });

  it('keeps a long position open above liquidation, then removes close actions after liquidation', async () => {
    const { stream } = renderPerpsMarketDetailsView({
      overrides: eligibleOverrides,
      initialParams: { market: ethMarket },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [longPosition],
        orders: [],
        marketData: [ethMarket],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([
        {
          ...longPosition,
          unrealizedPnl: '-100',
          returnOnEquity: '-0.12',
        },
      ]);
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  it('sets a stop loss and removes close actions after the SL-triggered close stream update', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    renderPerpsTPSLView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        currentPrice: '2500',
        direction: 'long',
        position: longPosition,
        initialTakeProfitPrice: '',
        initialStopLossPrice: '',
        leverage: 3,
        orderType: 'market',
        limitPrice: '',
        amount: '1',
        szDecimals: 2,
        onConfirm,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [longPosition],
        marketData: [ethMarket],
      },
    });

    fireEvent.changeText(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
      ),
      '2300',
    );
    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        longPosition,
        undefined,
        '2300',
        expect.objectContaining({ direction: 'long' }),
      );
    });

    await act(async () => {
      cleanup();
    });

    const stopLossPosition: Position = {
      ...longPosition,
      stopLossPrice: '2300',
      stopLossCount: 1,
    };
    const { stream } = renderPerpsMarketDetailsView({
      overrides: eligibleOverrides,
      initialParams: { market: ethMarket },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [stopLossPosition],
        orders: [],
        marketData: [ethMarket],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  it('sets a custom take profit and submits a market close for the long position', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    renderPerpsTPSLView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        currentPrice: '2500',
        direction: 'long',
        position: longPosition,
        initialTakeProfitPrice: '',
        initialStopLossPrice: '',
        leverage: 3,
        orderType: 'market',
        limitPrice: '',
        amount: '1',
        szDecimals: 2,
        onConfirm,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [longPosition],
        marketData: [ethMarket],
      },
    });

    fireEvent.changeText(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
      ),
      '2800',
    );
    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        longPosition,
        '2800',
        undefined,
        expect.objectContaining({ direction: 'long' }),
      );
    });

    await act(async () => {
      cleanup();
    });

    const takeProfitPosition: Position = {
      ...longPosition,
      takeProfitPrice: '2800',
      takeProfitCount: 1,
    };
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    const { stream } = renderPerpsClosePositionView({
      overrides: eligibleOverrides,
      initialParams: {
        position: takeProfitPosition,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [takeProfitPosition],
        marketData: [ethMarket],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
        },
      });
    });

    const confirmButton = await screen.findByTestId(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(closePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'market',
          position: expect.objectContaining({ symbol: 'ETH' }),
        }),
      );
    });
  });
});
