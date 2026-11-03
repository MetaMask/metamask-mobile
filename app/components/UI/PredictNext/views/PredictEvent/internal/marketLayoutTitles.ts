import { strings } from '../../../../../../../locales/i18n';

/** Layout keys with a translated title; any other key is titled from itself. */
const KNOWN_TITLES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    game_lines: 'predict_next.event.game_lines',
    moneyline: 'predict_next.event.market_layout.moneyline',
    spread: 'predict_next.event.market_layout.spread',
    total_points: 'predict_next.event.market_layout.total_points',
    team_total: 'predict_next.event.market_layout.team_total',
    full_game: 'predict_next.event.market_layout.full_game',
    first_half: 'predict_next.event.market_layout.first_half',
    second_half: 'predict_next.event.market_layout.second_half',
    q1: 'predict_next.event.market_layout.q1',
    q2: 'predict_next.event.market_layout.q2',
    q3: 'predict_next.event.market_layout.q3',
    q4: 'predict_next.event.market_layout.q4',
  }),
);

/** `player_points` → `Player points`. */
const titleFromKey = (key: string): string => {
  const words = key
    .split('_')
    .filter((word) => word.length > 0)
    .join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The title of a layout tab, section or period key. */
export const getMarketLayoutTitle = (key: string): string => {
  const titleId = KNOWN_TITLES.get(key);
  return titleId === undefined ? titleFromKey(key) : strings(titleId);
};

/** A period without a subgroup covers the whole game. */
export const getMarketLayoutPeriodTitle = (key?: string): string =>
  getMarketLayoutTitle(key ?? 'full_game');
