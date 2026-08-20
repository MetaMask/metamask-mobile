import {
  isMoneylineLikeMarketType,
  isTeamToAdvanceMarketType,
} from '../../constants/sports';
import { getMatchingSportTeam } from '../../utils/sports';
import type { PredictMarketGame } from '../../types';

interface NegRiskSportsMarket {
  negRisk?: boolean;
  sportsMarketType?: string;
  groupItemTitle?: string;
}

interface SportsTeamLogoMarket extends NegRiskSportsMarket {
  sportsMarketType?: string;
}

const normalizeTeamLabel = (value?: string): string | undefined =>
  value?.trim().toLowerCase();

const isGenericTeamLabel = (label: string): boolean => {
  const normalizedLabel = normalizeTeamLabel(label);
  return (
    normalizedLabel === 'team to advance' ||
    normalizedLabel?.startsWith('draw') === true
  );
};

export const hasNegRiskMoneylineGroupItem = <T extends NegRiskSportsMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.negRisk &&
      isMoneylineLikeMarketType(market.sportsMarketType) &&
      market.groupItemTitle,
  );

export const resolveNegRiskMoneylineShortTitles = (
  market: NegRiskSportsMarket,
  game: PredictMarketGame,
): { yesShort?: string; noShort?: string } => {
  if (!hasNegRiskMoneylineGroupItem(market)) {
    return {};
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return { yesShort: 'Draw' };
  }

  const yesTeam = getMatchingSportTeam(market.groupItemTitle, game);
  if (!yesTeam) return {};

  const isHome = yesTeam.id === game.homeTeam.id;
  const noAbbr = isHome
    ? game.awayTeam.abbreviation
    : game.homeTeam.abbreviation;

  return { yesShort: yesTeam.abbreviation, noShort: noAbbr };
};

export const getNegRiskMoneylineTeamLogo = (
  market: NegRiskSportsMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasNegRiskMoneylineGroupItem(market)) {
    return undefined;
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};

const hasSportsMarketTeamGroupItem = <T extends SportsTeamLogoMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.groupItemTitle &&
      (hasNegRiskMoneylineGroupItem(market) ||
        isTeamToAdvanceMarketType(market.sportsMarketType)),
  );

export const getSportsMarketTeamLogo = (
  market: SportsTeamLogoMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasSportsMarketTeamGroupItem(market)) {
    return undefined;
  }

  if (isGenericTeamLabel(market.groupItemTitle)) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};
