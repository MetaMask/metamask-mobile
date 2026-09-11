import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { createFundedAccountForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../Perps.testIds';
import PerpsMarketDetailsView from '../PerpsMarketDetailsView';
import PerpsBalanceOrderView from './PerpsBalanceOrderView';
import { PerpsBalanceOrderViewSelectorsIDs } from './PerpsBalanceOrderView.testIds';

const market = {
  symbol: 'ETH',
  name: 'Ethereum',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2%',
  volume: '$1.5B',
  openInterest: '$500M',
  maxLeverage: '50x',
  marketType: 'crypto',
  providerId: 'lighter' as const,
  szDecimals: 2,
};

const options = {
  mode: 'lite' as const,
  overrides: {
    engine: {
      backgroundState: {
        PerpsController: { activeProvider: 'lighter' as const },
      },
    },
  },
  streamOverrides: {
    marketData: [market],
    account: createFundedAccountForViews('1000'),
    prices: {
      ETH: {
        symbol: 'ETH',
        price: '2500',
        markPrice: '2500',
        timestamp: 1,
        isTradable: true,
      },
    },
    positions: [],
  },
};

describe('PerpsBalanceOrderView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.PerpsController.validateOrder)
      .mockResolvedValue({ isValid: true });
    jest
      .mocked(Engine.context.PerpsController.placeOrder)
      .mockResolvedValue({ success: true, orderId: 'balance-order-cv' });
  });

  it.each([
    PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
    PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
  ])(
    'opens a balance order from %s and returns to Lite without a deposit',
    async (button) => {
      const { store } = renderPerpsView(
        PerpsMarketDetailsView,
        Routes.PERPS.MARKET_DETAILS,
        {
          ...options,
          initialParams: { market },
          extraRoutes: [
            {
              name: Routes.PERPS.BALANCE_ORDER,
              Component: PerpsBalanceOrderView,
            },
          ],
        },
      );

      fireEvent.press(await screen.findByTestId(button));
      const input = await screen.findByTestId(
        PerpsProOrderFormSelectorsIDs.SIZE_INPUT,
      );
      fireEvent.changeText(input, '10');
      expect(input).toHaveProp('value', '10');
      const submit = screen.getByTestId(
        PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON,
      );
      await waitFor(() => expect(submit).toBeEnabled());
      fireEvent.press(submit);
      await waitFor(() =>
        expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'ETH',
            orderType: 'market',
            isBuy: button === PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
          }),
        ),
      );
      // Controller acceptance precedes the stream-confirmation/toast promise.
      // Keep the screen mounted until the full submission finishes.
      await waitFor(
        () =>
          expect(
            screen.getByTestId(PerpsProOrderFormSelectorsIDs.SIZE_INPUT),
          ).toHaveProp('value', ''),
        { timeout: 5000 },
      );
      expect(
        Engine.context.PerpsController.depositWithOrder,
      ).not.toHaveBeenCalled();
      expect(store.getState().engine.backgroundState.PerpsController.mode).toBe(
        'lite',
      );
      fireEvent.press(
        screen.getByTestId(PerpsBalanceOrderViewSelectorsIDs.BACK),
      );

      expect(await screen.findByTestId(button)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsBalanceOrderViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('preserves an order-book limit price and allows editing it', async () => {
    renderPerpsView(PerpsBalanceOrderView, Routes.PERPS.BALANCE_ORDER, {
      ...options,
      initialParams: {
        asset: 'ETH',
        direction: 'short',
        orderType: 'limit',
        price: '2600',
      },
    });

    const input = await screen.findByTestId(
      PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT,
    );
    expect(input).toHaveProp('value', '2600');
    fireEvent.changeText(input, '2700');

    expect(input).toHaveProp('value', '2700');
    expect(
      Engine.context.PerpsController.depositWithOrder,
    ).not.toHaveBeenCalled();
  });
});
