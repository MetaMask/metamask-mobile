import '../../../../../../../../tests/component-view/mocks';
import {
  configurePredictNextFeeds,
  makePredictNextCompositeGameEvent,
  makePredictNextMultiMarketEvent,
  makePredictNextTotalsEvent,
  messengerCall,
} from '../../../../../../../../tests/component-view/fixtures/predictNext';
import { renderEventMarketList } from '../../../../../../../../tests/component-view/renderers/predictNext';
import { act, fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { MarketStandardCardTestIds } from '../../../../events/markets/MarketStandardCard.testIds';
import { MarketGroupCardTestIds } from '../../../../events/markets/MarketGroupCard.testIds';
import type { PredictEvent } from '../../../../types';
import { EventMarketListTestIds } from './EventMarketList.testIds';

describe('EventMarketList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messengerCall.mockReset();
    configurePredictNextFeeds();
  });

  it('offers every Game Market, including winner Markets, in Game Lines', async () => {
    const event = makePredictNextCompositeGameEvent();
    const onOrder = jest.fn();
    const view = renderEventMarketList({
      event,
      onOrder,
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });

    fireEvent.press(
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
    );
    fireEvent.press(
      view.getByTestId(
        MarketStandardCardTestIds.yesButton(event.markets[0].id),
      ),
    );

    expect(
      within(view.getByTestId(EventMarketListTestIds.MARKETS_TAB)).getAllByText(
        strings('predict_next.event.game_lines'),
      )[0],
    ).toBeOnTheScreen();
    for (const market of event.markets.slice(0, 2)) {
      expect(
        view.getByTestId(MarketStandardCardTestIds.card(market.id)),
      ).toBeOnTheScreen();
    }
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
    ).toBeOnTheScreen();
    expect(onOrder).toHaveBeenCalledWith(
      event.markets[0],
      event.markets[0].outcomes[0],
    );
  });

  it.each(['standard', 'sports-context', 'sports-category'])(
    'uses Outcome for a %s Event without a Game snapshot',
    async (kind) => {
      const base = makePredictNextMultiMarketEvent();
      const game = makePredictNextCompositeGameEvent();
      const event: PredictEvent = {
        ...base,
        category: kind === 'standard' ? 'Politics' : 'Sports',
        sports:
          kind === 'sports-context' && game.sports
            ? { sport: game.sports.sport, competition: game.sports.competition }
            : undefined,
      };
      const onOrder = jest.fn();
      const view = renderEventMarketList({
        event,
        onOrder,
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      });

      fireEvent.press(
        await view.findByTestId(
          MarketStandardCardTestIds.noButton(event.markets[0].id),
        ),
      );

      expect(
        within(
          view.getByTestId(EventMarketListTestIds.MARKETS_TAB),
        ).getAllByText(strings('predict_next.event.outcome'))[0],
      ).toBeOnTheScreen();
      expect(onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[1],
      );
    },
  );

  it('keeps alternate selection on quote updates and emits the displayed Market for actions', async () => {
    const event = makePredictNextTotalsEvent();
    const [alternate] = event.markets;
    const onOrder = jest.fn();
    const onRulesPress = jest.fn();
    const callbacks = { onOrder, onRulesPress, onCashOut: jest.fn() };
    const view = renderEventMarketList({ event, ...callbacks });

    fireEvent.press(
      await view.findByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', alternate.id),
      ),
    );
    const updatedMarket: typeof alternate = {
      ...alternate,
      rules: 'The final score determines the result.',
      outcomes: [
        {
          ...alternate.outcomes[0],
          askPrice: event.markets[1].outcomes[0].askPrice,
        },
        alternate.outcomes[1],
      ],
    };
    act(() => {
      view.updateProps({
        event: { ...event, markets: [updatedMarket, event.markets[1]] },
        ...callbacks,
      });
    });
    fireEvent.press(
      view.getByTestId(MarketGroupCardTestIds.rulesButton('nfl-total-points')),
    );
    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          alternate.id,
          'yes',
        ),
      ),
    );

    expect(onRulesPress).toHaveBeenCalledWith(updatedMarket);
    expect(onOrder).toHaveBeenCalledWith(
      updatedMarket,
      updatedMarket.outcomes[0],
    );
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          event.markets[1].id,
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();

    act(() => {
      view.updateProps({
        event: { ...event, markets: [event.markets[1]] },
        ...callbacks,
      });
    });

    expect(
      view.getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          event.markets[1].id,
          'yes',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          alternate.id,
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();
  });
});
