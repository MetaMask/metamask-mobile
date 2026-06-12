import { isMoneylineLikeMarketType } from '../constants/sports';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  PredictSportTeam,
} from '../types';

const YES_OUTCOME_TITLE = 'Yes';
const DRAW_OUTCOME_TITLE = 'Draw';
const normalizeLabel = (value?: string) => value?.trim().toLowerCase() ?? '';

const matchesTeam = (label: string, team: PredictSportTeam): boolean => {
  const normalizedLabel = normalizeLabel(label);

  return [team.abbreviation, team.name, team.alias, team.logo].some(
    (teamLabel) => normalizeLabel(teamLabel) === normalizedLabel,
  );
};

const resolveTeamLogo = ({
  market,
  outcome,
  selectedOutcomeToken,
}: {
  market: PredictMarket;
  outcome: PredictOutcome;
  selectedOutcomeToken: PredictOutcomeToken;
}): string | undefined => {
  if (!market.game || !isMoneylineLikeMarketType(outcome.sportsMarketType)) {
    return undefined;
  }

  const labels = [
    selectedOutcomeToken.shortTitle,
    selectedOutcomeToken.title,
    outcome.groupItemTitle,
  ].filter(Boolean) as string[];

  const matchingTeam = [market.game.homeTeam, market.game.awayTeam].find(
    (team) => labels.some((label) => matchesTeam(label, team)),
  );

  return matchingTeam?.logo;
};

export const resolvePredictBuyHeaderDisplay = ({
  market,
  outcome,
  outcomeToken,
  previewOutcomeTokenId,
}: {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  previewOutcomeTokenId?: string;
}) => {
  const selectedOutcomeToken =
    outcome.tokens?.find((token) => token.id === previewOutcomeTokenId) ??
    outcomeToken;
  const normalizedGroupTitle = normalizeLabel(outcome.groupItemTitle);
  const normalizedTokenTitle = normalizeLabel(selectedOutcomeToken.title);
  const normalizedOutcomeTitle = normalizeLabel(outcome.title);
  const isDrawMoneylineSelection =
    isMoneylineLikeMarketType(outcome.sportsMarketType) &&
    normalizedTokenTitle === DRAW_OUTCOME_TITLE.toLowerCase() &&
    (normalizedGroupTitle.startsWith(DRAW_OUTCOME_TITLE.toLowerCase()) ||
      normalizedOutcomeTitle.startsWith(DRAW_OUTCOME_TITLE.toLowerCase()));
  const isMatchingMoneylineTeamSelection =
    isMoneylineLikeMarketType(outcome.sportsMarketType) &&
    normalizedGroupTitle.length > 0 &&
    normalizedGroupTitle === normalizedTokenTitle;

  let outcomeGroupTitle = outcome.groupItemTitle ?? '';
  let outcomeTokenTitle = selectedOutcomeToken.title ?? '';

  if (isDrawMoneylineSelection) {
    outcomeGroupTitle = DRAW_OUTCOME_TITLE;
    outcomeTokenTitle = YES_OUTCOME_TITLE;
  } else if (isMatchingMoneylineTeamSelection) {
    outcomeTokenTitle = YES_OUTCOME_TITLE;
  }

  return {
    selectedOutcomeToken,
    outcomeGroupTitle,
    outcomeTokenTitle,
    image:
      resolveTeamLogo({
        market,
        outcome,
        selectedOutcomeToken,
      }) ?? outcome.image,
  };
};
