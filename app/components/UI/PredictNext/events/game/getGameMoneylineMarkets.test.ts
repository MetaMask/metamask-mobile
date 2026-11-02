import composedNflGame from '../../contracts/v1/fixtures/composed-nfl-game.json';
import { parsePredictEvent } from '../../contracts/v1/marketData';
import type { PredictEvent, PredictMarket } from '../../types';
import { getGameMoneylineMarkets } from './getGameMoneylineMarkets';

const composedGame = parsePredictEvent(composedNflGame);
const ids = (markets: readonly PredictMarket[]) => markets.map(({ id }) => id);

const withMarkets = (markets: PredictMarket[]): PredictEvent => ({
  ...composedGame,
  markets,
});

describe('getGameMoneylineMarkets', () => {
  it('returns the full-game choice Markets, not period moneylines or lines', () => {
    expect(ids(getGameMoneylineMarkets(composedGame))).toEqual([
      'KXNFLGAME-26NOV02CHISEA-CHI',
      'KXNFLGAME-26NOV02CHISEA-SEA',
    ]);
  });

  it('falls back to the Markets without a group when no full-game choice exists', () => {
    const ungrouped = composedGame.markets
      .slice(0, 2)
      .map(({ group, layout, ...market }) => market);
    const periodMoneyline = composedGame.markets[2];

    expect(
      ids(
        getGameMoneylineMarkets(withMarkets([...ungrouped, periodMoneyline])),
      ),
    ).toEqual(['KXNFLGAME-26NOV02CHISEA-CHI', 'KXNFLGAME-26NOV02CHISEA-SEA']);
  });

  it('does not treat a choice group without layout as the full-game moneyline', () => {
    const withoutLayout = composedGame.markets.map(
      ({ layout, ...market }) => market,
    );

    expect(getGameMoneylineMarkets(withMarkets(withoutLayout))).toEqual([]);
  });

  it('returns no Markets for an Event without a moneyline', () => {
    expect(
      getGameMoneylineMarkets(withMarkets(composedGame.markets.slice(5))),
    ).toEqual([]);
  });
});
