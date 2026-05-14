/**
 * Component view tests for PerpsOrderView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { PriceUpdate } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsOrderView,
  type PerpsExtraRoute,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsLimitPriceBottomSheetSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../Perps.testIds';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';

const TIMEOUT_MS = 5000;

const account = createFundedAccountForViews('1000');
const accountWithBalance = createFundedAccountForViews;
const ethMarket = createEthMarketForViews();

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

const marketDetailsRoute: PerpsExtraRoute = {
  name: Routes.PERPS.MARKET_DETAILS,
  mount: 'perps-root',
};

const crossMarginWarningRoute: PerpsExtraRoute = {
  name: Routes.PERPS.MODALS.ROOT,
};

const emitEthPrice = (
  stream: { emitPrices: (prices: Record<string, PriceUpdate>) => void },
  percentChange24h = '2',
) => {
  act(() => {
    stream.emitPrices({
      ETH: {
        symbol: 'ETH',
        price: '2500',
        markPrice: '2500',
        percentChange24h,
        timestamp: Date.now(),
      },
    });
  });
};

const waitForDeferredOrderData = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
};

describe('PerpsOrderView', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeAll(() => {
    global.requestAnimationFrame = jest.fn((callback) => {
      setTimeout(() => callback(Date.now()), 0);
      return 1;
    });
  });

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  it('submits a market long after the trader reviews the calculated order details', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 4,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [marketDetailsRoute],
    });

    expect(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.HEADER,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByTestId(PerpsOrderViewSelectorsIDs.LEVERAGE_ROW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.MARGIN_VALUE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.FEES_VALUE),
    ).toBeOnTheScreen();

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    await waitFor(() => {
      expect(placeOrderButton).not.toBeDisabled();
    });
    await act(async () => {
      fireEvent.press(placeOrderButton);
    });

    await waitFor(() => {
      expect(placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          isBuy: true,
          orderType: 'market',
          leverage: 4,
          usdAmount: '120',
        }),
      );
    });
    await waitFor(
      () => {
        expect(
          Engine.context.PerpsController.clearPendingTradeConfiguration,
        ).toHaveBeenCalledWith('ETH');
      },
      { timeout: TIMEOUT_MS },
    );
    await waitForDeferredOrderData();
  });

  it('switches to limit order, accepts the Mid preset, and routes to TP/SL setup', async () => {
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'short',
        amount: '200',
        leverage: 3,
      },
      streamOverrides: {
        account,
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [{ name: Routes.PERPS.TPSL }],
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream, '-1');

    fireEvent.press(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      ),
    );
    await act(async () => {
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
        ),
      );
    });

    expect(
      await screen.findByText(
        strings('perps.order.limit_price_modal.title'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID),
    );
    fireEvent.press(
      screen.getByTestId(PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId(PerpsOrderViewSelectorsIDs.LIMIT_PRICE_ROW),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsOrderViewSelectorsIDs.STOP_LOSS_BUTTON),
    );

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.TPSL}`),
    ).toBeOnTheScreen();
  });

  it('blocks order submission when the account cannot satisfy the minimum order amount', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '5',
        leverage: 1,
      },
      streamOverrides: {
        account: accountWithBalance('1'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    expect(
      await screen.findByText(
        strings('perps.order.validation.insufficient_funds'),
      ),
    ).toBeOnTheScreen();
    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    expect(placeOrderButton).toBeDisabled();

    fireEvent.press(placeOrderButton);

    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('routes cross-margin positions to the warning modal instead of placing an order', async () => {
    const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
    const { stream } = renderPerpsOrderView({
      overrides: eligibleOverrides,
      initialParams: {
        asset: 'ETH',
        direction: 'long',
        amount: '120',
        leverage: 10,
      },
      streamOverrides: {
        account,
        positions: [
          {
            ...defaultPositionForViews,
            leverage: { value: 10, type: 'cross' },
          },
        ],
        orders: [],
        marketData: [ethMarket],
      },
      extraRoutes: [crossMarginWarningRoute],
    });

    await waitForDeferredOrderData();
    emitEthPrice(stream);

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
    await waitFor(() => {
      expect(placeOrderButton).not.toBeDisabled();
    });
    fireEvent.press(placeOrderButton);

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.MODALS.ROOT}`),
    ).toBeOnTheScreen();
    expect(placeOrder).not.toHaveBeenCalled();
  });
});
