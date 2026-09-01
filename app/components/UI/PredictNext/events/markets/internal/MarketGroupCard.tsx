import React from 'react';
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
import { strings } from '../../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../../types';
import {
  formatAskPrice,
  formatMarketGroupOption,
  getAskPricePercent,
} from '../../shared/formatting';
import { MarketGroupOptionSelector } from './MarketGroupOptionSelector';
import { MarketGroupCardTestIds } from '../MarketGroupCard.testIds';
import { MarketCard } from './MarketCard';

export interface MarketGroupCardProps {
  groupKey: string;
  title: string;
  markets: readonly PredictMarket[];
  selectedMarket: PredictMarket;
  onSelectMarket: (marketId: PredictMarket['id']) => void;
  onRulesPress: (market: PredictMarket) => void;
}

function findOutcome(
  market: PredictMarket,
  side: PredictOutcome['side'],
): PredictOutcome | undefined {
  return market.outcomes.find((outcome) => outcome.side === side);
}

function outcomePrefix(outcome: PredictOutcome): string {
  return (
    outcome.label.trim().slice(0, 1).toUpperCase() || outcome.side.toUpperCase()
  );
}

function getOutcomeOptionValue(
  market: PredictMarket,
  outcome: PredictOutcome,
): string {
  return formatMarketGroupOption(market, outcome.side) ?? '—';
}

function noOp(): void {
  return undefined;
}

function OutcomeRow({
  groupKey,
  market,
  outcome,
}: {
  groupKey: string;
  market: PredictMarket;
  outcome: PredictOutcome;
}): React.JSX.Element {
  const price = formatAskPrice(outcome.askPrice);
  const optionValue = getOutcomeOptionValue(market, outcome);
  const askPricePercent = getAskPricePercent(outcome.askPrice);
  const isYes = outcome.side === 'yes';
  const color = isYes ? TextColor.SuccessDefault : TextColor.ErrorDefault;
  const barColor = isYes ? 'bg-success-default' : 'bg-error-default';

  return (
    <Box
      testID={MarketGroupCardTestIds.row(groupKey, market.id, outcome.side)}
      twClassName="flex-row items-center gap-3"
    >
      <Box twClassName="min-w-0 flex-1 gap-2">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {outcome.label}
        </Text>
        {askPricePercent === undefined ? null : (
          <Box
            testID={MarketGroupCardTestIds.quoteBar(
              groupKey,
              market.id,
              outcome.side,
            )}
            twClassName="h-0.5 w-full rounded-full"
          >
            <Box
              twClassName={`h-0.5 rounded-full ${barColor}`}
              style={{ width: `${Math.max(9.5, askPricePercent)}%` }}
            />
          </Box>
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
      >
        {`${outcomePrefix(outcome)} ${optionValue}`}
      </Text>
      <Button
        testID={MarketGroupCardTestIds.outcomeButton(
          groupKey,
          market.id,
          outcome.side,
        )}
        accessibilityLabel={strings(
          'predict.market_groups.outcome_accessibility_label',
          {
            team: outcome.label,
            line: optionValue,
            price: price ?? strings('predict.market_groups.price_unavailable'),
          },
        )}
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
}

export function MarketGroupCard({
  groupKey,
  title,
  markets,
  selectedMarket,
  onSelectMarket,
  onRulesPress,
}: MarketGroupCardProps): React.JSX.Element | null {
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
        <MarketCard.Footer>
          <MarketGroupOptionSelector
            groupKey={groupKey}
            markets={markets}
            selectedMarketId={selectedMarket.id}
            onSelect={onSelectMarket}
          />
        </MarketCard.Footer>
      ) : null}
    </MarketCard.Root>
  );
}
