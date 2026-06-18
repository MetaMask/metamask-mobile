import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
  PriceUpdate,
} from '../../types';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import type { PredictSportOutcomeButton } from '../PredictSportOutcomeCard';
import { formatVolume } from '../../utils/format';
import { isValidPrice } from '../../utils/prices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

const I18N_PREFIX = 'predict.sports_market_types';
const MISSING_TRANSLATION_PREFIX = '[missing';
const loggedMissingTranslationKeys = new Set<string>();
const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;

export type BuyHandler = (
  outcome: PredictOutcome,
  token: PredictOutcomeToken,
) => void;

export type LivePriceGetter = (tokenId: string) => PriceUpdate | undefined;

const toTitleCase = (str: string): string =>
  str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const isMissingTranslation = (value: string, key: string): boolean =>
  value === key || value.startsWith(MISSING_TRANSLATION_PREFIX);

const logMissingSportsMarketTypeTranslation = (
  key: string,
  type: string,
): void => {
  if (loggedMissingTranslationKeys.has(key)) return;

  loggedMissingTranslationKeys.add(key);
  const message = `Missing Predict sports market type translation: ${key}`;
  Logger.error(new Error(message), {
    message,
    context: { key, type },
  });
};

export const getTranslatedSportsMarketTypeLabel = (
  type: string,
): string | undefined => {
  const key = `${I18N_PREFIX}.${type}`;
  const label = strings(key);
  if (typeof label !== 'string' || isMissingTranslation(label, key)) {
    logMissingSportsMarketTypeTranslation(key, type);
    return undefined;
  }
  return label;
};

export const getSportsMarketTypeLabel = (
  type: string,
  fallbackTitle?: string,
): string =>
  getTranslatedSportsMarketTypeLabel(type) ??
  fallbackTitle ??
  toTitleCase(type);

export const getFallbackSportsMarketTypeLabel = (
  type: string,
  fallbackTitle?: string,
): string => fallbackTitle ?? toTitleCase(type);

export const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title;
  if (!raw.includes('O/U')) return raw;

  const match = raw.match(O_U_PLAYER_PATTERN);
  if (match) return match[1].trim();

  const colonIdx = raw.indexOf(': ');
  if (colonIdx !== -1) return raw.slice(0, colonIdx).trim();

  return raw;
};

const getTeamColor = (
  tokenTitle: string,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game) return undefined;

  const normalizedTokenTitle = tokenTitle.trim().toLowerCase();
  const homeLabels = [
    game.homeTeam.abbreviation,
    game.homeTeam.name,
    game.homeTeam.alias,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label) => label.trim().toLowerCase());
  const awayLabels = [
    game.awayTeam.abbreviation,
    game.awayTeam.name,
    game.awayTeam.alias,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label) => label.trim().toLowerCase());

  if (homeLabels.includes(normalizedTokenTitle)) return game.homeTeam.color;
  if (awayLabels.includes(normalizedTokenTitle)) return game.awayTeam.color;
  return undefined;
};

const getButtonVariant = (
  index: number,
  total: number,
  moneyline: boolean,
): PredictBetButtonVariant => {
  if (!moneyline) return 'draw';
  if (total === 3 && index === 1) return 'draw';
  return index === 0 ? 'yes' : 'no';
};

export const buildButtons = (
  outcome: PredictOutcome,
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  sportsMarketType?: string,
): PredictSportOutcomeButton[] => {
  const moneyline = isMoneylineLikeMarketType(sportsMarketType);
  return outcome.tokens.map((token, index) => ({
    label: token.shortTitle ?? token.title,
    price: Math.round(token.price * 100),
    onPress: () => onBuyPress(outcome, token),
    variant: getButtonVariant(index, outcome.tokens.length, moneyline),
    teamColor: moneyline
      ? getTeamColor(token.shortTitle ?? token.title, game)
      : undefined,
  }));
};

export const buildSubtitle = (outcome: PredictOutcome): string =>
  `$${formatVolume(outcome.volume)} Vol`;

export const getDefaultLineIndex = (
  outcomes: PredictOutcome[],
  lineIndices: number[],
): number => {
  if (lineIndices.length === 0) return 0;

  return lineIndices.reduce((bestIndex, outcomeIndex, lineIndex) => {
    const bestOutcome = outcomes[lineIndices[bestIndex]];
    const outcome = outcomes[outcomeIndex];
    return (outcome?.volume ?? 0) > (bestOutcome?.volume ?? 0)
      ? lineIndex
      : bestIndex;
  }, 0);
};

const isDrawOutcome = (outcome: PredictOutcome): boolean =>
  outcome.groupItemTitle?.toLowerCase().startsWith('draw') ?? false;

export const sortMoneylineOutcomes = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): PredictOutcome[] => {
  const hasThresholds = outcomes.some((o) => o.groupItemThreshold != null);
  if (hasThresholds) {
    return [...outcomes].sort(
      (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
    );
  }

  const draw = outcomes.find(isDrawOutcome);
  const nonDraw = outcomes.filter((o) => !isDrawOutcome(o));
  if (!draw || nonDraw.length < 2) {
    return [...outcomes];
  }

  if (game) {
    const homeAbbr = game.homeTeam.abbreviation;
    const home = nonDraw.find((o) => o.tokens[0]?.shortTitle === homeAbbr);
    const away = nonDraw.find((o) => o !== home);
    if (home && away) {
      return [home, draw, away];
    }
  }

  const sorted = [...nonDraw].sort((a, b) =>
    (a.groupItemTitle ?? '').localeCompare(b.groupItemTitle ?? ''),
  );
  return [sorted[0], draw, ...sorted.slice(1)];
};

export const buildMoneylineButtons = (
  outcomes: PredictOutcome[],
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  getPrice?: LivePriceGetter,
): PredictSportOutcomeButton[] => {
  const sortedWithTokens = sortMoneylineOutcomes(outcomes, game).filter(
    (outcome) => outcome.tokens[0] !== undefined,
  );

  return sortedWithTokens.map((outcome, i) => {
    const yesToken = outcome.tokens[0];
    const liveBestAsk = getPrice?.(yesToken.id)?.bestAsk;
    const price = isValidPrice(liveBestAsk) ? liveBestAsk : yesToken.price;

    return {
      label: yesToken.shortTitle ?? yesToken.title,
      price: Math.round(price * 100),
      onPress: () => onBuyPress(outcome, yesToken),
      variant: getButtonVariant(i, sortedWithTokens.length, true),
      teamColor: getTeamColor(yesToken.shortTitle ?? yesToken.title, game),
    };
  });
};

export const buildMoneylineSubtitle = (outcomes: PredictOutcome[]): string => {
  const totalVolume = outcomes.reduce((sum, o) => sum + o.volume, 0);
  return `$${formatVolume(totalVolume)} Vol`;
};
