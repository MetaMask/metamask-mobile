import React from 'react';
import { View, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictMarketMultiple.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { PredictEvent } from '../../types';
import { formatVolume } from '../../utils/format';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictMarketMultipleProps {
  event: PredictEvent;
}

const PredictMarketMultiple: React.FC<PredictMarketMultipleProps> = ({
  event,
}) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();

  const getFirstOutcomePrice = (outcomePrices?: string): string | undefined => {
    if (!outcomePrices) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(outcomePrices);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstValue = parseFloat(parsed[0]);
        return (firstValue * 100).toFixed(2);
      }
    } catch (error) {
      console.warn('Failed to parse outcomePrices:', outcomePrices, error);
    }

    return undefined;
  };

  const getOutcomeLabels = (outcomes?: string): string[] => {
    if (!outcomes) {
      return [];
    }

    try {
      const parsed = JSON.parse(outcomes);
      if (Array.isArray(parsed)) {
        return parsed.map((outcome) => String(outcome));
      }
    } catch (error) {
      console.warn('Failed to parse outcomes:', outcomes, error);
    }

    return [];
  };

  const totalVolume = event.markets.reduce((sum, market) => {
    const volume =
      typeof market.volume === 'string'
        ? parseFloat(market.volume)
        : market.volume || 0;
    return sum + volume;
  }, 0);

  const totalVolumeDisplay = formatVolume(totalVolume);

  return (
    <View style={styles.marketContainer}>
      <Box key={event.id}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-3"
        >
          <Box twClassName="w-12 h-12 rounded-lg bg-muted overflow-hidden">
            {event.markets[0]?.image && (
              <Box twClassName="w-full h-full">
                <Image
                  source={{ uri: event.markets[0].image }}
                  style={tw.style('w-full h-full')}
                  resizeMode="cover"
                />
              </Box>
            )}
          </Box>
          <Box twClassName="flex-1">
            <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
              {event.title}
            </Text>
          </Box>
        </Box>

        {event.markets.map((market) => {
          const outcomeLabels = getOutcomeLabels(market.outcomes);

          return (
            <Box
              key={`${market.id}`}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="py-1 gap-4"
            >
              <Box twClassName="flex-1">
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {market.groupItemTitle}
                </Text>
              </Box>

              <Box>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {getFirstOutcomePrice(market.outcomePrices)}%
                </Text>
              </Box>

              <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  label={
                    <Text
                      style={tw.style('font-bold')}
                      color={TextColor.Success}
                    >
                      {outcomeLabels[0]}
                    </Text>
                  }
                  onPress={() =>
                    navigation.navigate(Routes.PREDICT.MARKET_DETAILS)
                  }
                  style={styles.buttonYes}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  label={
                    <Text style={tw.style('font-bold')} color={TextColor.Error}>
                      {outcomeLabels[1]}
                    </Text>
                  }
                  onPress={() =>
                    navigation.navigate(Routes.PREDICT.MARKET_DETAILS)
                  }
                  style={styles.buttonNo}
                />
              </Box>
            </Box>
          );
        })}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mt-4"
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {event.markets.length * 2} outcomes
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            ${totalVolumeDisplay} Vol.
          </Text>
        </Box>
      </Box>
    </View>
  );
};

export default PredictMarketMultiple;
