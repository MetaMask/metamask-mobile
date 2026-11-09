import { strings } from '../../../../../../../locales/i18n';
import {
  getMarketLayoutPeriodTitle,
  getMarketLayoutTitle,
} from './marketLayoutTitles';

describe('getMarketLayoutTitle', () => {
  it.each([
    ['game_lines', 'predict_next.event.game_lines'],
    ['outcomes', 'predict_next.event.outcomes'],
    ['markets', 'predict_next.event.market_layout.markets'],
    ['moneyline', 'predict_next.event.market_layout.moneyline'],
    ['total_points', 'predict_next.event.market_layout.total_points'],
    ['team_total', 'predict_next.event.market_layout.team_total'],
    ['first_half', 'predict_next.event.market_layout.first_half'],
    ['q4', 'predict_next.event.market_layout.q4'],
    ['player_props', 'predict_next.event.market_layout.player_props'],
    ['anytime_touchdown', 'predict_next.event.market_layout.anytime_touchdown'],
    ['passing_yards', 'predict_next.event.market_layout.passing_yards'],
  ])('translates the known key %s', (key, titleId) => {
    expect(getMarketLayoutTitle(key)).toBe(strings(titleId));
  });

  it.each([
    ['player_points', 'Player points'],
    ['overtime', 'Overtime'],
    ['__double__underscore_', 'Double underscore'],
    ['', ''],
  ])('titles the unknown key %p from itself', (key, title) => {
    expect(getMarketLayoutTitle(key)).toBe(title);
  });

  it('does not treat inherited object keys as known', () => {
    expect(getMarketLayoutTitle('constructor')).toBe('Constructor');
  });
});

describe('getMarketLayoutPeriodTitle', () => {
  it('titles a period without a subgroup as the full game', () => {
    expect(getMarketLayoutPeriodTitle(undefined)).toBe(
      strings('predict_next.event.market_layout.full_game'),
    );
  });

  it('titles a keyed period like any layout key', () => {
    expect(getMarketLayoutPeriodTitle('second_half')).toBe(
      strings('predict_next.event.market_layout.second_half'),
    );
  });
});
