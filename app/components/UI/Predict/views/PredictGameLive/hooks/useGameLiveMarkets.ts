import { useMemo } from 'react';
import { getPrimaryMoneylineOutcomes } from '../../../constants/sports';
import { buildOutcomeGroups } from '../../../providers/polymarket/utils';
import type { GameLiveMarkets } from '../../../services/gameEvents';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictSportTeam,
} from '../../../types';

export interface MoneylineTeamTokens {
  outcome: PredictOutcome;
  homeToken?: PredictOutcomeToken;
  awayToken?: PredictOutcomeToken;
}

const matchesTeam = (
  tokenTitle: string | undefined,
  team: PredictSportTeam,
): boolean => {
  if (!tokenTitle) return false;
  const lower = tokenTitle.toLowerCase();
  return [team.name, team.alias, team.abbreviation]
    .filter(Boolean)
    .some((value) => lower === value?.toLowerCase());
};

const findTeamToken = (
  tokens: PredictOutcomeToken[],
  team: PredictSportTeam,
): PredictOutcomeToken | undefined =>
  tokens.find(
    (token) =>
      matchesTeam(token.title, team) || matchesTeam(token.shortTitle, team),
  );

/**
 * Resolves the primary moneyline outcome and its home/away tokens for a
 * non-draw game (e.g. NBA: one outcome with two team tokens). Mirrors the
 * token-matching rules used by PredictMarketSportCard's buy buttons.
 */
export const getMoneylineTeamTokens = (
  market: PredictMarket,
  game: PredictMarketGame,
): MoneylineTeamTokens | null => {
  const outcome = getPrimaryMoneylineOutcomes(market.outcomes)[0];
  if (!outcome) return null;

  const homeToken =
    findTeamToken(outcome.tokens, game.homeTeam) ?? outcome.tokens[0];
  const awayToken =
    findTeamToken(outcome.tokens, game.awayTeam) ??
    outcome.tokens.find((token) => token.id !== homeToken?.id) ??
    outcome.tokens[1];

  return { outcome, homeToken, awayToken };
};

const outcomesByType = (
  outcomes: PredictOutcome[],
  type: string,
): PredictOutcome[] =>
  outcomes.filter(
    (outcome) =>
      outcome.sportsMarketType?.toLowerCase() === type &&
      outcome.status === 'open',
  );

export interface UseGameLiveMarketsResult {
  /** Primary moneyline outcome + team tokens for the quick-bet bar / header. */
  moneyline: MoneylineTeamTokens | null;
  /** Real game markets by kind, for inline feed widgets. */
  feedMarkets: GameLiveMarkets;
  /** Grouped outcomes for the Markets tab (falls back to local grouping). */
  outcomeGroups: PredictOutcomeGroup[];
}

/**
 * Derives the betting surfaces for the Game Live screen from a single fetched
 * market: quick-bet moneyline tokens, per-kind outcome lists for inline feed
 * widgets, and the grouped outcomes powering the Markets tab. Groups locally
 * via `buildOutcomeGroups` when the provider didn't attach `outcomeGroups`
 * (i.e. the extended-sports-markets flag doesn't cover the league).
 */
export const useGameLiveMarkets = (
  market: PredictMarket | undefined,
): UseGameLiveMarketsResult =>
  useMemo(() => {
    const game = market?.game;
    if (!market || !game) {
      return { moneyline: null, feedMarkets: {}, outcomeGroups: [] };
    }

    const feedMarkets: GameLiveMarkets = {
      moneyline: outcomesByType(market.outcomes, 'moneyline'),
      spread: outcomesByType(market.outcomes, 'spreads'),
      total: outcomesByType(market.outcomes, 'totals'),
    };

    return {
      moneyline: getMoneylineTeamTokens(market, game),
      feedMarkets,
      outcomeGroups:
        market.outcomeGroups && market.outcomeGroups.length > 0
          ? market.outcomeGroups
          : buildOutcomeGroups(market.outcomes),
    };
  }, [market]);
