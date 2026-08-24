import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictOutcome,
  PredictSettlementSource,
} from '../../types';
import {
  formatAskPrice,
  formatVolume,
  getAskPricePercent,
} from '../shared/formatting';
import { MarketStandardCardTestIds } from './MarketStandardCard.testIds';
import { MarketCard } from './internal/MarketCard';
import MarketRulesBottomSheet from './internal/MarketRulesBottomSheet';

export interface MarketStandardCardProps {
  market: PredictMarket;
  settlementSources?: readonly PredictSettlementSource[];
}

const findOutcome = (
  market: PredictMarket,
  side: 'yes' | 'no',
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

export const MarketStandardCard = ({
  market,
  settlementSources,
}: MarketStandardCardProps) => {
  const [isRulesSheetVisible, setIsRulesSheetVisible] = useState(false);
  const rules = market.rules?.trim();
  const handleRulesPress = useCallback(() => {
    setIsRulesSheetVisible(true);
  }, []);
  const handleRulesClose = useCallback(() => {
    setIsRulesSheetVisible(false);
  }, []);
  const yesOutcome = findOutcome(market, 'yes');
  const noOutcome = findOutcome(market, 'no');

  if (!yesOutcome || !noOutcome) {
    return null;
  }

  const volume = formatVolume(market.volume);
  const yesPercent = getAskPricePercent(yesOutcome.askPrice);
  const yesPrice = formatAskPrice(yesOutcome.askPrice);
  const noPrice = formatAskPrice(noOutcome.askPrice);

  return (
    <>
      <MarketCard.Root testID={MarketStandardCardTestIds.card(market.id)}>
        <MarketCard.Header>
          <MarketCard.Summary>
            <Box twClassName="flex-row items-center gap-2.5 min-w-0">
              <Box twClassName="min-w-0 shrink">
                <MarketCard.Title
                  testID={MarketStandardCardTestIds.title(market.id)}
                >
                  {yesOutcome.label}
                </MarketCard.Title>
              </Box>
              {rules ? (
                <ButtonIcon
                  iconName={IconName.Question}
                  size={ButtonIconSize.Sm}
                  iconProps={{ color: IconColor.IconAlternative }}
                  onPress={handleRulesPress}
                  testID={MarketStandardCardTestIds.rulesButton(market.id)}
                  accessibilityLabel={strings(
                    'predict.market_rules.accessibility_label',
                  )}
                  accessibilityRole="button"
                />
              ) : null}
            </Box>
            {volume ? (
              <MarketCard.Volume
                value={volume}
                testID={MarketStandardCardTestIds.volume(market.id)}
              />
            ) : null}
          </MarketCard.Summary>
          {yesPercent !== undefined ? (
            <MarketCard.Percentage
              value={yesPercent}
              testID={MarketStandardCardTestIds.percentage(market.id)}
            />
          ) : null}
        </MarketCard.Header>

        {yesPercent !== undefined ? (
          <MarketCard.SplitBar
            yesPercent={yesPercent}
            testID={MarketStandardCardTestIds.bar(market.id)}
            yesTestID={MarketStandardCardTestIds.barYes(market.id)}
            noTestID={MarketStandardCardTestIds.barNo(market.id)}
          />
        ) : null}

        <MarketCard.Actions>
          <MarketCard.OutcomeButton
            label="Yes"
            price={yesPrice}
            side="yes"
            testID={MarketStandardCardTestIds.yesButton(market.id)}
          />
          <MarketCard.OutcomeButton
            label="No"
            price={noPrice}
            side="no"
            testID={MarketStandardCardTestIds.noButton(market.id)}
          />
        </MarketCard.Actions>
      </MarketCard.Root>
      {rules ? (
        <MarketRulesBottomSheet
          isVisible={isRulesSheetVisible}
          marketId={market.id}
          rules={rules}
          settlementSources={settlementSources}
          onClose={handleRulesClose}
        />
      ) : null}
    </>
  );
};
