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
const FIFA_WORLD_CUP_LEAGUE = 'fifwc';

const WORLD_CUP_MARKET_TYPE_LABEL_KEYS: Record<string, string> = {
  moneyline: 'predict.world_cup.market_info.regulation_time_winner.title',
  soccer_team_to_advance: 'predict.world_cup.market_info.team_to_advance.title',
};

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

const getWorldCupSportsMarketTypeLabel = (
  type?: string,
  game?: PredictMarketGame,
): string | undefined => {
  if (!type || game?.league !== FIFA_WORLD_CUP_LEAGUE) {
    return undefined;
  }

  const key = WORLD_CUP_MARKET_TYPE_LABEL_KEYS[type.toLowerCase()];
  return key ? strings(key) : undefined;
};

export const getSportsMarketTypeLabelForGame = (
  type: string,
  fallbackTitle?: string,
  game?: PredictMarketGame,
): string =>
  getWorldCupSportsMarketTypeLabel(type, game) ??
  getSportsMarketTypeLabel(type, fallbackTitle);

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

const getTokenLabel = (token: PredictOutcomeToken): string =>
  token.shortTitle ?? token.title;

const isYesNoLabel = (label: string): boolean => {
  const normalized = label.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'no';
};

/**
 * Plain binary markets (e.g. Extra Time?, Penalty Shootout?) have exactly two
 * Yes/No tokens and are not team-based, so they should render Yes (yes) and No
 * (no) buttons rather than the neutral "draw" styling used for other
 * non-moneyline outcomes.
 */
const isBinaryYesNoTokens = (tokens: PredictOutcomeToken[]): boolean =>
  tokens.length === 2 &&
  tokens.every((token) => isYesNoLabel(getTokenLabel(token)));

// Caller must guarantee the label is "Yes"/"No" (see isBinaryYesNoTokens);
// any other value falls back to the "no" variant.
const getYesNoVariant = (label: string): PredictBetButtonVariant =>
  label.trim().toLowerCase() === 'yes' ? 'yes' : 'no';

const isNeutralMoneylineToken = (token: PredictOutcomeToken): boolean => {
  const label = getTokenLabel(token).trim().toLowerCase();
  return label.startsWith('draw') || label.startsWith('neither');
};

const getTeamOrder = (
  token: PredictOutcomeToken,
  game?: PredictMarketGame,
): number => {
  if (!game) return 1;

  const label = getTokenLabel(token).trim().toLowerCase();
  const homeLabels = [
    game.homeTeam.abbreviation,
    game.homeTeam.name,
    game.homeTeam.alias,
  ]
    .filter((teamLabel): teamLabel is string => Boolean(teamLabel))
    .map((teamLabel) => teamLabel.trim().toLowerCase());
  const awayLabels = [
    game.awayTeam.abbreviation,
    game.awayTeam.name,
    game.awayTeam.alias,
  ]
    .filter((teamLabel): teamLabel is string => Boolean(teamLabel))
    .map((teamLabel) => teamLabel.trim().toLowerCase());

  if (homeLabels.includes(label)) return 0;
  if (awayLabels.includes(label)) return 2;
  return 1;
};

const sortMoneylineTokensForDisplay = (
  tokens: PredictOutcomeToken[],
  game?: PredictMarketGame,
): PredictOutcomeToken[] => {
  if (tokens.length !== 3) {
    return tokens;
  }

  const neutralToken = tokens.find(isNeutralMoneylineToken);
  if (!neutralToken) {
    return tokens;
  }

  const teamTokens = tokens
    .filter((token) => token !== neutralToken)
    .sort((a, b) => getTeamOrder(a, game) - getTeamOrder(b, game));

  return [teamTokens[0], neutralToken, teamTokens[1]];
};

export const buildButtons = (
  outcome: PredictOutcome,
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  sportsMarketType?: string,
): PredictSportOutcomeButton[] => {
  const moneyline = isMoneylineLikeMarketType(sportsMarketType);
  const tokens = moneyline
    ? sortMoneylineTokensForDisplay(outcome.tokens, game)
    : outcome.tokens;
  const binaryYesNo = !moneyline && isBinaryYesNoTokens(tokens);

  return tokens.map((token, index) => {
    const label = getTokenLabel(token);
    return {
      label,
      price: Math.round(token.price * 100),
      onPress: () => onBuyPress(outcome, token),
      variant: binaryYesNo
        ? getYesNoVariant(label)
        : getButtonVariant(index, tokens.length, moneyline),
      teamColor: moneyline ? getTeamColor(label, game) : undefined,
    };
  });
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

const isNeutralMoneylineLabel = (label?: string): boolean => {
  const normalizedLabel = label?.trim().toLowerCase() ?? '';
  return (
    normalizedLabel.startsWith('draw') || normalizedLabel.startsWith('neither')
  );
};

const isNeitherMoneylineLabel = (label?: string): boolean =>
  label?.trim().toLowerCase().startsWith('neither') ?? false;

const isNeutralMoneylineOutcome = (outcome: PredictOutcome): boolean =>
  isNeutralMoneylineLabel(outcome.groupItemTitle) ||
  isNeutralMoneylineLabel(outcome.tokens[0]?.title) ||
  isNeutralMoneylineLabel(outcome.tokens[0]?.shortTitle);

const isNeitherMoneylineOutcome = (outcome: PredictOutcome): boolean =>
  isNeitherMoneylineLabel(outcome.groupItemTitle) ||
  isNeitherMoneylineLabel(outcome.tokens[0]?.title) ||
  isNeitherMoneylineLabel(outcome.tokens[0]?.shortTitle);

export const sortMoneylineOutcomes = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): PredictOutcome[] => {
  const hasThresholds = outcomes.some((o) => o.groupItemThreshold != null);
  const orderedOutcomes = hasThresholds
    ? [...outcomes].sort(
        (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
      )
    : outcomes;

  const neutral = orderedOutcomes.find(isNeutralMoneylineOutcome);
  const nonNeutral = orderedOutcomes.filter(
    (o) => !isNeutralMoneylineOutcome(o),
  );
  if (!neutral || nonNeutral.length < 2) {
    return [...orderedOutcomes];
  }

  if (isNeitherMoneylineOutcome(neutral)) {
    return [nonNeutral[0], neutral, ...nonNeutral.slice(1)];
  }

  if (hasThresholds) {
    return [...orderedOutcomes];
  }

  if (game) {
    const homeAbbr = game.homeTeam.abbreviation;
    const home = nonNeutral.find((o) => o.tokens[0]?.shortTitle === homeAbbr);
    const away = nonNeutral.find((o) => o !== home);
    if (home && away) {
      return [home, neutral, away];
    }
  }

  const sorted = [...nonNeutral].sort((a, b) =>
    (a.groupItemTitle ?? '').localeCompare(b.groupItemTitle ?? ''),
  );
  return [sorted[0], neutral, ...sorted.slice(1)];
};

export const getMoneylineButtonEntries = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): { outcome: PredictOutcome; token: PredictOutcomeToken }[] => {
  const sortedWithTokens = sortMoneylineOutcomes(outcomes, game).filter(
    (outcome) => outcome.tokens.length > 0,
  );

  if (sortedWithTokens.length === 1) {
    const [outcome] = sortedWithTokens;
    return sortMoneylineTokensForDisplay(outcome.tokens, game).map((token) => ({
      outcome,
      token,
    }));
  }

  return sortedWithTokens.flatMap((outcome) => {
    const token = outcome.tokens[0];
    return token ? [{ outcome, token }] : [];
  });
};

export const buildMoneylineButtons = (
  outcomes: PredictOutcome[],
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  getPrice?: LivePriceGetter,
): PredictSportOutcomeButton[] => {
  const buttonEntries = getMoneylineButtonEntries(outcomes, game);

  return buttonEntries.map(({ outcome, token }, i) => {
    const liveBestAsk = getPrice?.(token.id)?.bestAsk;
    const price = isValidPrice(liveBestAsk) ? liveBestAsk : token.price;

    const label = getTokenLabel(token);
    return {
      label,
      price: Math.round(price * 100),
      onPress: () => onBuyPress(outcome, token),
      variant: getButtonVariant(i, buttonEntries.length, true),
      teamColor: getTeamColor(label, game),
    };
  });
};

export const buildMoneylineSubtitle = (outcomes: PredictOutcome[]): string => {
  const totalVolume = outcomes.reduce((sum, o) => sum + o.volume, 0);
  return `$${formatVolume(totalVolume)} Vol`;
};
