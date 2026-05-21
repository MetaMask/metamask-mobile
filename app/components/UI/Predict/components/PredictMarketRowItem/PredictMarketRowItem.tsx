import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatPercentage } from '../../utils/format';
import { usePredictEntryPoint } from '../../contexts';
import { usePredictNavigation } from '../../hooks/usePredictNavigation';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface PredictMarketRowItemProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  showChevron?: boolean;
  /** Replaces the market image when set (e.g. Material Icons on homepage discovery). */
  leadingAccessory?: React.ReactNode;
  /** Optional title for market-details navigation (row can still show `market.title`). */
  detailsTitle?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onPress?: () => void;
}

const PredictMarketRowItem = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  showChevron = false,
  leadingAccessory,
  detailsTitle,
  transactionActiveAbTests,
  onPress,
}: PredictMarketRowItemProps) => {
  const { navigateToMarketDetails } = usePredictNavigation();
  const tw = useTailwind();
  const contextEntryPoint = usePredictEntryPoint();
  const entryPoint =
    contextEntryPoint ??
    propEntryPoint ??
    PredictEventValues.ENTRY_POINT.TRENDING_SEARCH;

  // Get the highest probability open outcome
  // Outcomes are already sorted by first token price (descending) from the API
  const topOutcome = useMemo(() => {
    const outcome = market.outcomes.find(
      (o) => o.status === 'open' && o.tokens?.[0],
    );

    if (!outcome?.tokens?.[0]) return null;

    return {
      probability: formatPercentage(outcome.tokens[0].price * 100, {
        truncate: true,
      }),
      outcomeTitle: outcome.groupItemTitle || outcome.title,
    };
  }, [market.outcomes]);

  const handlePress = useCallback(() => {
    onPress?.();
    navigateToMarketDetails(
      {
        marketId: market.id,
        entryPoint,
        title: detailsTitle ?? market.title,
        image: market.image,
        ...(transactionActiveAbTests?.length && {
          transactionActiveAbTests,
        }),
      },
      { throughRoot: true },
    );
  }, [
    onPress,
    market,
    entryPoint,
    navigateToMarketDetails,
    detailsTitle,
    transactionActiveAbTests,
  ]);

  if (!topOutcome) {
    return null;
  }

  return (
    <TouchableOpacity
      style={tw.style('flex-row items-center self-stretch py-2')}
      onPress={handlePress}
      testID={testID || `predict-market-row-item-${market.id}`}
    >
      <Box twClassName="h-10 w-10 rounded-full bg-muted overflow-hidden items-center justify-center">
        {leadingAccessory ??
          (market.image ? (
            <Image
              source={{ uri: market.image }}
              style={tw.style('w-full h-full')}
              resizeMode="cover"
            />
          ) : null)}
      </Box>
      <View style={tw.style('flex-1 pl-4')}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('font-medium')}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {market.title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={tw.style('mt-0.5')}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {topOutcome.probability} chance on {topOutcome.outcomeTitle}
        </Text>
      </View>
      {showChevron && (
        <Box twClassName="pl-2 justify-center">
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      )}
    </TouchableOpacity>
  );
};

export default PredictMarketRowItem;
