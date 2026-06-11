import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import PredictSportOutcomeCard, {
  type PredictSportOutcomeButton,
} from '../PredictSportOutcomeCard';
import { formatVolume } from '../../utils/format';
import { isValidPrice } from '../../utils/prices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

const I18N_PREFIX = 'predict.sports_market_types';
const MISSING_TRANSLATION_PREFIX = '[missing';
const loggedMissingTranslationKeys = new Set<string>();

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

const getTranslatedSportsMarketTypeLabel = (
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

type BuyHandler = (outcome: PredictOutcome, token: PredictOutcomeToken) => void;

const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;

const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
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

const buildButtons = (
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

const buildSubtitle = (outcome: PredictOutcome): string =>
  `$${formatVolume(outcome.volume)} Vol`;

const SimpleOutcomeCard = memo(
  ({
    outcome,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    testID,
  }: {
    outcome: PredictOutcome;
    title: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => (
    <PredictSportOutcomeCard
      title={title}
      subtitle={buildSubtitle(outcome)}
      buttons={buildButtons(outcome, onBuyPress, game, sportsMarketType)}
      testID={testID}
    />
  ),
);

SimpleOutcomeCard.displayName = 'SimpleOutcomeCard';

const LineOutcomeCard = memo(
  ({
    outcomes,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    testID,
  }: {
    outcomes: PredictOutcome[];
    title?: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => {
    const lineIndices = useMemo(
      () =>
        outcomes
          .map((o, i) => (o.line != null ? i : -1))
          .filter((i) => i !== -1)
          .sort((a, b) => {
            const lineA = outcomes[a].line ?? 0;
            const lineB = outcomes[b].line ?? 0;
            return lineA - lineB;
          }),
      [outcomes],
    );

    const lines = useMemo(
      () => lineIndices.map((i) => Math.abs(outcomes[i].line ?? 0)),
      [lineIndices, outcomes],
    );

    const initialSelectedIdx = useMemo(() => {
      if (lineIndices.length === 0) {
        return 0;
      }

      return lineIndices.reduce((bestIdx, outcomeIdx, currentIdx) => {
        const bestVolume = outcomes[lineIndices[bestIdx]]?.volume ?? 0;
        const currentVolume = outcomes[outcomeIdx]?.volume ?? 0;

        return currentVolume > bestVolume ? currentIdx : bestIdx;
      }, 0);
    }, [lineIndices, outcomes]);

    const [selectedIdx, setSelectedIdx] = useState(initialSelectedIdx);

    useEffect(() => {
      setSelectedIdx(initialSelectedIdx);
    }, [initialSelectedIdx]);

    const handleSelectLine = useCallback(
      (_line: number, indexInLines: number) => {
        setSelectedIdx(indexInLines);
      },
      [],
    );

    const selectedOutcome = useMemo(
      () => outcomes[lineIndices[selectedIdx]] ?? outcomes[0],
      [outcomes, lineIndices, selectedIdx],
    );

    if (!selectedOutcome) return null;

    return (
      <PredictSportOutcomeCard
        title={title ?? formatOutcomeCardTitle(selectedOutcome)}
        subtitle={buildSubtitle(selectedOutcome)}
        buttons={buildButtons(
          selectedOutcome,
          onBuyPress,
          game,
          sportsMarketType,
        )}
        lines={lines}
        selectedLine={lines[selectedIdx]}
        selectedIndex={selectedIdx}
        onSelectLine={handleSelectLine}
        testID={testID}
      />
    );
  },
);

LineOutcomeCard.displayName = 'LineOutcomeCard';

// The neutral pick of a 3-way market — "Draw" (moneyline) or "Neither" (first
// to score). It is rendered as the middle button with no team color.
const isNeutralOutcome = (outcome: PredictOutcome): boolean => {
  const title = outcome.groupItemTitle?.toLowerCase() ?? '';
  return title.startsWith('draw') || title.startsWith('neither');
};

const sortMoneylineOutcomes = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): PredictOutcome[] => {
  const ordered = ((): PredictOutcome[] => {
    const hasThresholds = outcomes.some((o) => o.groupItemThreshold != null);
    if (hasThresholds) {
      return [...outcomes].sort(
        (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
      );
    }

    const neutral = outcomes.find(isNeutralOutcome);
    const others = outcomes.filter((o) => !isNeutralOutcome(o));
    if (!neutral || others.length < 2) {
      return [...outcomes];
    }

    if (game) {
      const homeAbbr = game.homeTeam.abbreviation;
      const home = others.find((o) => o.tokens[0]?.shortTitle === homeAbbr);
      const away = others.find((o) => o !== home);
      if (home && away) {
        return [home, neutral, away];
      }
    }

    const sorted = [...others].sort((a, b) =>
      (a.groupItemTitle ?? '').localeCompare(b.groupItemTitle ?? ''),
    );
    return [sorted[0], neutral, ...sorted.slice(1)];
  })();

  // Keep the neutral pick (Draw / Neither) in the middle of a 3-way market so it
  // gets the neutral button styling, even when the source order does not.
  if (ordered.length === 3) {
    const neutralIdx = ordered.findIndex(isNeutralOutcome);
    if (neutralIdx === 0 || neutralIdx === 2) {
      const neutral = ordered[neutralIdx];
      const rest = ordered.filter((_, i) => i !== neutralIdx);
      return [rest[0], neutral, rest[1]];
    }
  }

  return ordered;
};

const buildMoneylineButtons = (
  outcomes: PredictOutcome[],
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  getPrice?: ReturnType<typeof useLiveMarketPrices>['getPrice'],
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

const buildMoneylineSubtitle = (outcomes: PredictOutcome[]): string => {
  const totalVolume = outcomes.reduce((sum, o) => sum + o.volume, 0);
  return `$${formatVolume(totalVolume)} Vol`;
};

const MoneylineCard = memo(
  ({
    outcomes,
    onBuyPress,
    game,
    title,
    testID,
  }: {
    outcomes: PredictOutcome[];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    testID: string;
  }) => {
    const subtitle = useMemo(
      () => buildMoneylineSubtitle(outcomes),
      [outcomes],
    );
    const tokenIds = useMemo(
      () =>
        sortMoneylineOutcomes(outcomes, game)
          .map((outcome) => outcome.tokens[0]?.id)
          .filter((id): id is string => Boolean(id)),
      [outcomes, game],
    );
    const { getPrice } = useLiveMarketPrices(tokenIds);
    const buttons = useMemo(
      () => buildMoneylineButtons(outcomes, onBuyPress, game, getPrice),
      [outcomes, onBuyPress, game, getPrice],
    );

    return (
      <PredictSportOutcomeCard
        title={title}
        subtitle={subtitle}
        buttons={buttons}
        buttonLayout="inlineNoSeparator"
        testID={testID}
      />
    );
  },
);

MoneylineCard.displayName = 'MoneylineCard';

interface OutcomeCardProps {
  card: PredictOutcomeGroup;
  onBuyPress: BuyHandler;
  game?: PredictMarketGame;
  groupKey: string;
}

/**
 * Renders a single pre-built card. The provider (buildOutcomeGroups) has
 * already assigned each card to a tab and split markets into per-subject cards
 * (team totals per team, player props per player), so the only decision here is
 * the card layout, derived from the card's outcomes: a moneyline-like type with
 * multiple outcomes renders an inline Home/Draw/Away card; multiple outcomes
 * render a line card with an Over/Under selector; a single outcome renders a
 * simple card. The title comes from the provider (`card.title`, set for subject
 * splits) or is derived — the market-type label for aggregate cards, else the
 * outcome's own title.
 */
const OutcomeCard = memo(
  ({ card, onBuyPress, game, groupKey }: OutcomeCardProps) => {
    const { outcomes } = card;
    const firstOutcome = outcomes[0];
    const sportsMarketType = firstOutcome?.sportsMarketType;
    const testID = `${groupKey}-${card.key}`;

    // Cards split by subject (team / player) and individual markets (exact
    // score, ...) carry their title from the provider. Aggregate cards
    // (moneyline, totals, corners, ...) have no title and are labelled by their
    // market type — including single-outcome ones like a two-way moneyline.
    const title =
      card.title ??
      getSportsMarketTypeLabel(
        sportsMarketType ?? card.key,
        firstOutcome ? formatOutcomeCardTitle(firstOutcome) : card.key,
      );

    if (isMoneylineLikeMarketType(sportsMarketType) && outcomes.length > 1) {
      return (
        <MoneylineCard
          outcomes={outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={title}
          testID={testID}
        />
      );
    }

    if (outcomes.length <= 1) {
      if (!firstOutcome) return null;
      return (
        <SimpleOutcomeCard
          outcome={firstOutcome}
          title={title}
          onBuyPress={onBuyPress}
          game={game}
          sportsMarketType={sportsMarketType}
          testID={testID}
        />
      );
    }

    return (
      <LineOutcomeCard
        outcomes={outcomes}
        title={title}
        onBuyPress={onBuyPress}
        game={game}
        sportsMarketType={sportsMarketType}
        testID={testID}
      />
    );
  },
);

OutcomeCard.displayName = 'OutcomeCard';

const OutcomesContent = memo(
  ({
    group,
    onBuyPress,
    game,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
  }) => (
    <>
      {(group.subgroups ?? []).map((card) => (
        <OutcomeCard
          key={card.key}
          card={card}
          onBuyPress={onBuyPress}
          game={game}
          groupKey={group.key}
        />
      ))}
    </>
  ),
);

OutcomesContent.displayName = 'OutcomesContent';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({ groupMap, game, activeChipKey, onBuyPress }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {selectedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={selectedGroup}
              onBuyPress={onBuyPress}
              game={game}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
