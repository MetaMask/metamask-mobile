import React from 'react';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../types';
import {
  formatAskPrice,
  formatMarketGroupOption,
  getAskPricePercent,
} from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { MarketGroupCardTestIds } from './MarketGroupCard.testIds';
import { MarketCard } from './internal/MarketCard';
import { MarketGroupOptionSelector } from './internal/MarketGroupOptionSelector';

export interface ThresholdMarketGroupCardProps {
  groupKey: string;
  markets: readonly PredictMarket[];
  selectedMarket: PredictMarket;
  onSelectMarket: (marketId: PredictMarket['id']) => void;
  onRulesPress?: (market: PredictMarket) => void;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
}

const findOutcome = (
  market: PredictMarket,
  side: PredictOutcome['side'],
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

/**
 * An "at least N" ladder as one card: the group label with the selected line
 * ("Josh Jacobs: 60+"), the line's chance, Yes and No, and a picker of its
 * lines. It knows nothing about the sport or stat the lines count.
 */
export const ThresholdMarketGroupCard = React.memo(
  ({
    groupKey,
    markets,
    selectedMarket,
    onSelectMarket,
    onRulesPress,
    onOrder,
  }: ThresholdMarketGroupCardProps): React.JSX.Element | null => {
    const yesOutcome = findOutcome(selectedMarket, 'yes');
    const noOutcome = findOutcome(selectedMarket, 'no');

    if (!yesOutcome || !noOutcome) {
      return null;
    }

    const label = selectedMarket.group?.label?.trim();
    const line =
      formatMarketGroupOption(selectedMarket) ??
      strings('predict.market_groups.line_unavailable');
    const title = label ? `${label}: ${line}` : line;
    const rules = selectedMarket.rules?.trim();
    const yesPercent = getAskPricePercent(yesOutcome.askPrice);

    return (
      <MarketCard.Root testID={MarketGroupCardTestIds.card(groupKey)}>
        <MarketCard.Header>
          <MarketCard.Summary>
            <Box twClassName="min-w-0 flex-row items-center gap-2.5">
              <Box twClassName="min-w-0 shrink">
                <MarketCard.Title
                  testID={MarketGroupCardTestIds.title(groupKey)}
                >
                  {title}
                </MarketCard.Title>
              </Box>
              {rules && onRulesPress ? (
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
          </MarketCard.Summary>
          {yesPercent !== undefined ? (
            <MarketCard.Percentage
              value={yesPercent}
              testID={MarketGroupCardTestIds.percentage(groupKey)}
            />
          ) : null}
        </MarketCard.Header>

        <MarketCard.Actions>
          <MarketCard.OutcomeButton
            label="Yes"
            price={formatAskPrice(yesOutcome.askPrice)}
            side="yes"
            testID={MarketGroupCardTestIds.outcomeButton(
              groupKey,
              selectedMarket.id,
              'yes',
            )}
            onPress={() => onOrder?.(selectedMarket, yesOutcome)}
            isDisabled={!isOutcomeTradeable(selectedMarket, yesOutcome)}
          />
          <MarketCard.OutcomeButton
            label="No"
            price={formatAskPrice(noOutcome.askPrice)}
            side="no"
            testID={MarketGroupCardTestIds.outcomeButton(
              groupKey,
              selectedMarket.id,
              'no',
            )}
            onPress={() => onOrder?.(selectedMarket, noOutcome)}
            isDisabled={!isOutcomeTradeable(selectedMarket, noOutcome)}
          />
        </MarketCard.Actions>

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
  },
);

ThresholdMarketGroupCard.displayName = 'ThresholdMarketGroupCard';
