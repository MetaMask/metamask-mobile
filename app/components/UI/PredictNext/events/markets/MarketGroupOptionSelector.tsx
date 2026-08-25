import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PredictMarket } from '../../types';
import { MarketGroupCardTestIds } from './MarketGroupCard.testIds';

export interface MarketGroupOptionSelectorProps {
  groupKey: string;
  markets: readonly PredictMarket[];
  selectedMarketId: PredictMarket['id'];
  onSelect: (marketId: PredictMarket['id']) => void;
}

const getOptionValue = (market: PredictMarket): number | undefined =>
  market.group?.option?.type === 'number'
    ? market.group.option.value
    : undefined;

export const MarketGroupOptionSelector = ({
  groupKey,
  markets,
  selectedMarketId,
  onSelect,
}: MarketGroupOptionSelectorProps) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={MarketGroupCardTestIds.selector(groupKey)}
      contentContainerStyle={tw.style('items-center gap-6 px-1')}
    >
      {markets.map((market) => {
        const isSelected = market.id === selectedMarketId;
        const optionValue = getOptionValue(market);

        return (
          <Pressable
            key={market.id}
            testID={MarketGroupCardTestIds.option(groupKey, market.id)}
            accessibilityRole="button"
            accessibilityLabel={
              optionValue === undefined
                ? 'Market option'
                : `Market option ${optionValue}`
            }
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(market.id)}
            style={tw.style('items-center justify-center gap-1 py-1')}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={
                isSelected ? TextColor.TextDefault : TextColor.TextAlternative
              }
            >
              {optionValue ?? '—'}
            </Text>
            {isSelected ? (
              <Box twClassName="h-2 w-2 rotate-45 bg-default" />
            ) : (
              <Box twClassName="h-2 w-2" />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
