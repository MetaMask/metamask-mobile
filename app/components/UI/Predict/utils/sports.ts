import {
  isTeamToAdvanceMarketType,
  WORLD_CUP_LEAGUE,
} from '../constants/sports';
import {
  getPrimarySportsCardOutcomes,
  getTokenImage,
} from '../providers/polymarket/sportsUtils';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
  PredictSportTeam,
} from '../types';

interface TeamMatchedOutcome {
  groupItemTitle?: string;
  tokens: { title?: string; shortTitle?: string }[];
}

export interface SportCardOutcome<TToken extends SportCardToken> {
  id: string;
  sportsMarketType?: string;
  groupItemThreshold?: number;
  tokens: TToken[];
}

export interface SportCardToken {
  id: string;
  title?: string;
}

export interface SportCardBetSide<
  TOutcome extends SportCardOutcome<TToken>,
  TToken extends SportCardToken,
> {
  outcome: TOutcome;
  token: TToken;
}

export interface ResolvedSportCardButtons<
  TOutcome extends SportCardOutcome<TToken>,
  TToken extends SportCardToken,
> {
  home?: SportCardBetSide<TOutcome, TToken>;
  draw?: SportCardBetSide<TOutcome, TToken>;
  away?: SportCardBetSide<TOutcome, TToken>;
  isTeamToAdvance: boolean;
  remainingOptions: number;
}

const normalizeTeamLabel = (value?: string): string | undefined =>
  value?.trim().toLowerCase();

export const sportTeamMatchesLabel = (
  label: string | undefined,
  team: PredictSportTeam,
): boolean => {
  const normalizedLabel = normalizeTeamLabel(label);
  if (!normalizedLabel) {
    return false;
  }

  return [team.name, team.alias, team.abbreviation]
    .map(normalizeTeamLabel)
    .some((teamLabel) => teamLabel === normalizedLabel);
};

export const outcomeMatchesTeam = <T extends TeamMatchedOutcome>(
  outcome: T,
  team: PredictSportTeam,
): boolean => {
  const tokenLabel = outcome.tokens[0]?.shortTitle ?? outcome.tokens[0]?.title;

  return (
    sportTeamMatchesLabel(outcome.groupItemTitle, team) ||
    sportTeamMatchesLabel(tokenLabel, team)
  );
};

export const getTeamOutcome = <T extends TeamMatchedOutcome & { id: string }>(
  outcomes: T[],
  team: PredictSportTeam,
  fallbackIndex: number,
  excludedOutcome?: T,
): T | undefined =>
  outcomes.find(
    (outcome) =>
      outcome.id !== excludedOutcome?.id && outcomeMatchesTeam(outcome, team),
  ) ??
  outcomes.find((outcome) => outcome.id !== excludedOutcome?.id) ??
  outcomes[fallbackIndex];

export const getMatchingSportTeam = (
  groupItemTitle: string,
  game: PredictMarketGame,
): PredictSportTeam | undefined =>
  [game.homeTeam, game.awayTeam].find((team) =>
    sportTeamMatchesLabel(groupItemTitle, team),
  );

export const getSportTeamColorForLabel = (
  label: string | undefined,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !label) {
    return undefined;
  }

  if (sportTeamMatchesLabel(label, game.homeTeam)) {
    return game.homeTeam.color;
  }

  if (sportTeamMatchesLabel(label, game.awayTeam)) {
    return game.awayTeam.color;
  }

  return undefined;
};

export const getSportTeamDisplayOrder = (
  label: string | undefined,
  game?: PredictMarketGame,
): number => {
  if (!game || !label) {
    return 1;
  }

  if (sportTeamMatchesLabel(label, game.homeTeam)) {
    return 0;
  }

  if (sportTeamMatchesLabel(label, game.awayTeam)) {
    return 2;
  }

  return 1;
};

export const getPrimaryMoneylineOutcomes = <
  T extends { sportsMarketType?: string },
>(
  outcomes: T[],
): T[] => {
  const moneylineOutcomes = outcomes.filter(
    (outcome) => outcome.sportsMarketType?.toLowerCase() === 'moneyline',
  );

  return moneylineOutcomes.length > 0 ? moneylineOutcomes : outcomes;
};

export const getBuyOutcomeImage = ({
  outcome,
  outcomeToken,
  game,
}: {
  outcome: PredictOutcome;
  outcomeToken?: PredictOutcomeToken;
  game?: PredictMarketGame;
}): string | undefined => {
  if (
    game?.league === WORLD_CUP_LEAGUE &&
    isTeamToAdvanceMarketType(outcome.sportsMarketType)
  ) {
    return (
      outcomeToken?.image ??
      getTokenImage({
        sportsMarketType: outcome.sportsMarketType,
        tokenTitle: outcomeToken?.title,
        game,
      }) ??
      outcome.image
    );
  }

  return outcome.image;
};

const getTeamToken = <TToken extends SportCardToken>(
  tokens: TToken[],
  team: PredictSportTeam,
  excludedTokenIds: string[] = [],
): TToken | undefined =>
  tokens.find((token) => sportTeamMatchesLabel(token.title, team)) ??
  tokens.find((token) => !excludedTokenIds.includes(token.id)) ??
  tokens[0];

const getDrawToken = <TToken extends SportCardToken>(
  tokens: TToken[],
): TToken | undefined =>
  tokens.find((token) => token.title?.toLowerCase() === 'draw');

export const resolveSportCardButtons = <
  TOutcome extends SportCardOutcome<TToken>,
  TToken extends SportCardToken,
>({
  outcomes,
  game,
  showDraw,
}: {
  outcomes: TOutcome[];
  game: PredictMarketGame;
  showDraw: boolean;
}): ResolvedSportCardButtons<TOutcome, TToken> => {
  const primaryOutcomes = getPrimarySportsCardOutcomes(outcomes, game.league);
  const firstOutcome = primaryOutcomes[0];
  const isTeamToAdvance =
    game.league === WORLD_CUP_LEAGUE &&
    isTeamToAdvanceMarketType(firstOutcome?.sportsMarketType);

  const fallbackResult = {
    isTeamToAdvance,
    remainingOptions: isTeamToAdvance ? 0 : Math.max(0, outcomes.length - 1),
  };

  if (!firstOutcome) {
    return fallbackResult;
  }

  const sortedDrawOutcomes =
    showDraw && !isTeamToAdvance && primaryOutcomes.length >= 3
      ? [...primaryOutcomes].sort(
          (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
        )
      : null;

  if (sortedDrawOutcomes) {
    const [homeOutcome, drawOutcome, awayOutcome] = sortedDrawOutcomes;
    const homeToken = getTeamToken(homeOutcome.tokens, game.homeTeam);
    const drawToken = getDrawToken(drawOutcome.tokens) ?? drawOutcome.tokens[0];
    const awayToken = getTeamToken(awayOutcome.tokens, game.awayTeam);

    return {
      ...fallbackResult,
      home: homeToken ? { outcome: homeOutcome, token: homeToken } : undefined,
      draw: drawToken ? { outcome: drawOutcome, token: drawToken } : undefined,
      away: awayToken ? { outcome: awayOutcome, token: awayToken } : undefined,
    };
  }

  if (isTeamToAdvance && primaryOutcomes.length >= 2) {
    const homeOutcome = getTeamOutcome(primaryOutcomes, game.homeTeam, 0);
    const awayOutcome = getTeamOutcome(
      primaryOutcomes,
      game.awayTeam,
      1,
      homeOutcome,
    );
    const homeToken = homeOutcome
      ? getTeamToken(homeOutcome.tokens, game.homeTeam)
      : undefined;
    const awayToken = awayOutcome
      ? getTeamToken(
          awayOutcome.tokens,
          game.awayTeam,
          [homeToken?.id].filter((id): id is string => Boolean(id)),
        )
      : undefined;

    return {
      ...fallbackResult,
      home:
        homeOutcome && homeToken
          ? { outcome: homeOutcome, token: homeToken }
          : undefined,
      away:
        awayOutcome && awayToken
          ? { outcome: awayOutcome, token: awayToken }
          : undefined,
    };
  }

  const homeToken = getTeamToken(firstOutcome.tokens, game.homeTeam);
  const drawToken =
    showDraw && !isTeamToAdvance
      ? getDrawToken(firstOutcome.tokens)
      : undefined;
  const awayToken = getTeamToken(
    firstOutcome.tokens,
    game.awayTeam,
    [homeToken?.id, drawToken?.id].filter((id): id is string => Boolean(id)),
  );

  return {
    ...fallbackResult,
    home: homeToken ? { outcome: firstOutcome, token: homeToken } : undefined,
    draw: drawToken ? { outcome: firstOutcome, token: drawToken } : undefined,
    away: awayToken ? { outcome: firstOutcome, token: awayToken } : undefined,
  };
};
