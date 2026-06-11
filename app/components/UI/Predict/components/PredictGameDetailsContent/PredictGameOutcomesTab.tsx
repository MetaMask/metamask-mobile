import React, { memo, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameOutcomeCard, {
  formatOutcomeCardTitle,
  type BuyHandler,
  type LineCardModel,
  type MoneylineCardModel,
  type OutcomeCardModel,
  type SharedPricingStrategy,
  type SimpleCardModel,
} from './PredictGameOutcomeCard';

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

const collectOutcomeTokenIds = (outcomes: PredictOutcome[]): string[] => [
  ...new Set(
    outcomes.flatMap((outcome) => outcome.tokens.map((token) => token.id)),
  ),
];

const buildSharedPricingStrategy = (
  outcomes: PredictOutcome[],
): SharedPricingStrategy => ({
  kind: 'shared',
  tokenIds: collectOutcomeTokenIds(outcomes),
});

const getCardTitle = (
  card: Pick<PredictOutcomeGroup, 'key' | 'title' | 'outcomes'>,
  fallbackType?: string,
): string | undefined => {
  if (card.title) {
    return card.title;
  }

  const firstOutcome = card.outcomes[0];
  const marketType = fallbackType ?? firstOutcome?.sportsMarketType ?? card.key;

  if (!marketType) {
    return firstOutcome ? formatOutcomeCardTitle(firstOutcome) : undefined;
  }

  return getSportsMarketTypeLabel(
    marketType,
    firstOutcome ? formatOutcomeCardTitle(firstOutcome) : card.key,
  );
};

const buildSubgroupCardModel = (
  subgroup: PredictOutcomeGroup,
  groupKey: string,
): OutcomeCardModel | null => {
  const testID = `${groupKey}-${subgroup.key}`;
  const firstOutcome = subgroup.outcomes[0];
  if (!firstOutcome) {
    return null;
  }

  const title = getCardTitle(subgroup, subgroup.key);

  if (
    isMoneylineLikeMarketType(firstOutcome.sportsMarketType) &&
    subgroup.outcomes.length > 1
  ) {
    return {
      kind: 'moneyline',
      key: subgroup.key,
      title: title ?? subgroup.key,
      testID,
      outcomes: subgroup.outcomes,
      pricing: buildSharedPricingStrategy(subgroup.outcomes),
    };
  }

  if (subgroup.outcomes.length <= 1) {
    return {
      kind: 'simple',
      key: firstOutcome.id,
      title: title ?? formatOutcomeCardTitle(firstOutcome),
      testID,
      outcome: firstOutcome,
      sportsMarketType: firstOutcome.sportsMarketType,
      pricing: buildSharedPricingStrategy([firstOutcome]),
    };
  }

  return {
    kind: 'line',
    key: subgroup.key,
    title,
    testID,
    outcomes: subgroup.outcomes,
    sportsMarketType: firstOutcome.sportsMarketType,
    pricing: { kind: 'selected-line' },
  };
};

export const buildOutcomeCardModels = (
  group: PredictOutcomeGroup,
): OutcomeCardModel[] => {
  if (group.subgroups && group.subgroups.length > 0) {
    return group.subgroups
      .map((subgroup) => buildSubgroupCardModel(subgroup, group.key))
      .filter((cardModel): cardModel is OutcomeCardModel => Boolean(cardModel));
  }

  const firstOutcome = group.outcomes[0];
  const firstType = firstOutcome?.sportsMarketType;
  if (
    firstType &&
    isMoneylineLikeMarketType(firstType) &&
    group.outcomes.length > 1
  ) {
    return [
      {
        kind: 'moneyline',
        key: `${group.key}-moneyline`,
        title:
          getCardTitle(
            {
              key: firstType,
              outcomes: group.outcomes,
            },
            firstType,
          ) ?? firstType,
        testID: `${group.key}-moneyline`,
        outcomes: group.outcomes,
        pricing: buildSharedPricingStrategy(group.outcomes),
      },
    ];
  }

  return group.outcomes.map((outcome, index) => ({
    kind: 'simple',
    key: outcome.id,
    title: formatOutcomeCardTitle(outcome),
    testID: `${group.key}-outcome-${index}`,
    outcome,
    sportsMarketType: outcome.sportsMarketType,
    pricing: buildSharedPricingStrategy([outcome]),
  }));
};

const collectSharedTokenIds = (cardModels: OutcomeCardModel[]): string[] => [
  ...new Set(
    cardModels.flatMap((cardModel) =>
      cardModel.pricing.kind === 'shared' ? cardModel.pricing.tokenIds : [],
    ),
  ),
];

const OutcomesContent = memo(
  ({
    group,
    onBuyPress,
    game,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
  }) => {
    const cardModels = useMemo(() => buildOutcomeCardModels(group), [group]);
    const sharedTokenIds = useMemo(
      () => collectSharedTokenIds(cardModels),
      [cardModels],
    );
    const { getPrice } = useLiveMarketPrices(sharedTokenIds);

    return (
      <>
        {cardModels.map((cardModel) => (
          <PredictGameOutcomeCard
            key={cardModel.key}
            cardModel={cardModel}
            onBuyPress={onBuyPress}
            game={game}
            getPrice={getPrice}
          />
        ))}
      </>
    );
  },
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
