import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictMarketRowItem.styles';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatPercentage } from '../../utils/format';
import { usePredictEntryPoint } from '../../contexts';

interface PredictMarketRowItemProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarketRowItem = ({
  market,
  testID,
  entryPoint: propEntryPoint,
}: PredictMarketRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
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
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint,
        title: market.title,
        image: market.image,
      },
    });
  }, [market, entryPoint, navigation]);

  if (!topOutcome) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={testID || `predict-market-row-item-${market.id}`}
    >
      <View style={styles.iconContainer}>
        <Box twClassName="rounded-full bg-muted overflow-hidden items-center justify-center">
          {market.image ? (
            <Image
              source={{ uri: market.image }}
              style={tw.style('w-full h-full')}
              resizeMode="cover"
            />
          ) : (
            <Box twClassName="w-full h-full bg-muted" />
          )}
        </Box>
      </View>
      <View style={styles.leftContainer}>
        <View style={styles.marketHeaderRow}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={tw.style('font-medium')}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {market.title}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {topOutcome.probability} chance on {topOutcome.outcomeTitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default PredictMarketRowItem;
