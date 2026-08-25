import React from 'react';
import type { DimensionValue } from 'react-native';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice, getAskPricePercent } from '../shared/formatting';
import { MarketGroupOptionSelector } from './MarketGroupOptionSelector';
import { MarketGroupCardTestIds } from './MarketGroupCard.testIds';
import { MarketCard } from './internal/MarketCard';

export interface MarketGroupCardProps {
  groupKey: string;
  title: string;
  markets: readonly PredictMarket[];
  selectedMarket: PredictMarket;
  onSelectMarket: (marketId: PredictMarket['id']) => void;
  onRulesPress: (market: PredictMarket) => void;
}

const findOutcome = (
  market: PredictMarket,
  side: PredictOutcome['side'],
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

const outcomePrefix = (outcome: PredictOutcome): string =>
  outcome.label.trim().slice(0, 1).toUpperCase() || outcome.side.toUpperCase();

const getOptionValue = (market: PredictMarket): number | undefined =>
  market.group?.option?.type === 'number'
    ? market.group.option.value
    : undefined;

const getBarWidth = (outcome: PredictOutcome): DimensionValue => {
  const percent = getAskPricePercent(outcome.askPrice);
  return percent === undefined ? 24 : `${Math.max(9.5, percent)}%`;
};

const noOp = (): void => undefined;

const OutcomeRow = ({
  groupKey,
  market,
  outcome,
}: {
  groupKey: string;
  market: PredictMarket;
  outcome: PredictOutcome;
}) => {
  const price = formatAskPrice(outcome.askPrice);
  const optionValue = getOptionValue(market);
  const color =
    outcome.side === 'yes' ? TextColor.SuccessDefault : TextColor.ErrorDefault;

  return (
    <Box
      testID={MarketGroupCardTestIds.row(groupKey, market.id, outcome.side)}
      twClassName="flex-row items-center gap-3"
    >
      <Box twClassName="min-w-0 flex-1 gap-2">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {outcome.label}
        </Text>
        <Box twClassName="h-0.5 w-full rounded-full">
          <Box
            twClassName={`h-0.5 rounded-full ${
              outcome.side === 'yes' ? 'bg-success-default' : 'bg-error-default'
            }`}
            style={{ width: getBarWidth(outcome) }}
          />
        </Box>
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
      >
        {`${outcomePrefix(outcome)} ${optionValue ?? '—'}`}
      </Text>
      <Button
        testID={MarketGroupCardTestIds.outcomeButton(
          groupKey,
          market.id,
          outcome.side,
        )}
        accessibilityLabel={
          price
            ? `${outcome.label}, ${price}`
            : `${outcome.label}, price unavailable`
        }
        isDisabled
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={noOp}
        twClassName="h-12 min-w-[64px] rounded-xl bg-muted px-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={color}
        >
          {price ?? '—'}
        </Text>
      </Button>
    </Box>
  );
};

export const MarketGroupCard = ({
  groupKey,
  title,
  markets,
  selectedMarket,
  onSelectMarket,
  onRulesPress,
}: MarketGroupCardProps) => {
  const rules = selectedMarket.rules?.trim();
  const yesOutcome = findOutcome(selectedMarket, 'yes');
  const noOutcome = findOutcome(selectedMarket, 'no');

  if (!yesOutcome || !noOutcome) {
    return null;
  }

  return (
    <MarketCard.Root testID={MarketGroupCardTestIds.card(groupKey)}>
      <Box twClassName="flex-row items-center gap-2">
        <Box twClassName="min-w-0 flex-1">
          <MarketCard.Title testID={MarketGroupCardTestIds.title(groupKey)}>
            {title}
          </MarketCard.Title>
        </Box>
        {rules ? (
          <ButtonIcon
            iconName={IconName.Question}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            onPress={() => onRulesPress(selectedMarket)}
            testID={MarketGroupCardTestIds.rulesButton(groupKey)}
            accessibilityLabel={strings(
              'predict.rules.market_accessibility_label',
            )}
            accessibilityRole="button"
          />
        ) : null}
      </Box>
      <Box twClassName="gap-3">
        <OutcomeRow
          groupKey={groupKey}
          market={selectedMarket}
          outcome={yesOutcome}
        />
        <OutcomeRow
          groupKey={groupKey}
          market={selectedMarket}
          outcome={noOutcome}
        />
      </Box>
      {markets.length > 1 ? (
        <MarketGroupOptionSelector
          groupKey={groupKey}
          markets={markets}
          selectedMarketId={selectedMarket.id}
          onSelect={onSelectMarket}
        />
      ) : null}
    </MarketCard.Root>
  );
};
