import { makePredictNextCompositeGameEvent } from '../../../../../../../tests/component-view/fixtures/predictNext';
import composedNflGame from '../../../contracts/v1/fixtures/composed-nfl-game.json';
import { parsePredictEvent } from '../../../contracts/v1/marketData';
import { resolveGameHistoryMarkets } from './resolveGameHistoryMarkets';

describe('resolveGameHistoryMarkets', () => {
  it('selects the full-game choice Markets when period moneylines are present', () => {
    const result = resolveGameHistoryMarkets(
      parsePredictEvent(composedNflGame),
    );

    expect(result?.home.market.id).toBe('KXNFLGAME-26NOV02CHISEA-SEA');
    expect(result?.away.market.id).toBe('KXNFLGAME-26NOV02CHISEA-CHI');
  });

  it('selects ungrouped winners when grouped spreads come first', () => {
    const event = makePredictNextCompositeGameEvent();
    const groupedMarkets = event.markets.filter(
      (market) => market.group !== undefined,
    );
    const winnerMarkets = event.markets.filter(
      (market) => market.group === undefined,
    );

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: [...groupedMarkets, ...winnerMarkets],
    });

    expect(result?.home.market.id).toBe('nfl-composite-home-market');
    expect(result?.away.market.id).toBe('nfl-composite-away-market');
  });

  it('returns no pair when ungrouped winners are missing', () => {
    const event = makePredictNextCompositeGameEvent();

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: event.markets.filter((market) => market.group !== undefined),
    });

    expect(result).toBeUndefined();
  });

  it('returns no pair when one winner selection is ambiguous', () => {
    const event = makePredictNextCompositeGameEvent();
    const homeMarket = event.markets.find(
      (market) =>
        market.group === undefined &&
        market.outcomes.some(
          (outcome) =>
            outcome.side === 'yes' && outcome.gameSelection === 'home',
        ),
    );
    if (homeMarket === undefined) {
      throw new Error('Expected a home winner Market fixture.');
    }

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: [...event.markets, homeMarket],
    });

    expect(result).toBeUndefined();
  });
});
