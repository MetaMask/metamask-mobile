import React from 'react';
import { Image, View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictMarketMultiple.styles';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictMarket } from '../../types';
import { formatVolume } from '../../utils/format';
interface PredictMarketMultipleProps {
  market: PredictMarket;
}

const PredictMarketMultiple: React.FC<PredictMarketMultipleProps> = ({
  market,
}) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();

  const getFirstOutcomePrice = (
    outcomePrices?: number[],
  ): string | undefined => {
    if (!outcomePrices) {
      return undefined;
    }

    try {
      const parsed = outcomePrices;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstValue = parsed[0];
        return (firstValue * 100).toFixed(2);
      }
    } catch (error) {
      console.warn('Failed to parse outcomePrices:', outcomePrices, error);
    }

    return undefined;
  };

  const totalVolume = market.outcomes.reduce((sum, outcome) => {
    const volume =
      typeof outcome.volume === 'string'
        ? parseFloat(outcome.volume)
        : outcome.volume || 0;
    return sum + volume;
  }, 0);

  const totalVolumeDisplay = formatVolume(totalVolume);

  return (
    <View style={styles.marketContainer}>
      <Box key={market.id}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-3"
        >
          <Box twClassName="w-12 h-12 rounded-lg bg-muted overflow-hidden">
            {market.outcomes[0]?.image && (
              <Box twClassName="w-full h-full">
                <Image
                  source={{ uri: market.outcomes[0].image }}
                  style={tw.style('w-full h-full')}
                  resizeMode="cover"
                />
              </Box>
            )}
          </Box>
          <Box twClassName="flex-1">
            <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
              {market.title}
            </Text>
          </Box>
        </Box>

        {market.outcomes.slice(0, 3).map((outcome) => {
          const outcomeLabels = outcome.tokens.map((token) => token.title);
          return (
            <Box
              key={`${market.id}`}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="py-1 gap-4"
            >
              <Box twClassName="flex-1">
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {outcome.groupItemTitle}
                </Text>
              </Box>

              <Box>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {getFirstOutcomePrice(
                    outcome.tokens.map((token) => token.price),
                  ) ?? '0'}
                  %
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
            {market.outcomes.length > 3
              ? `+${market.outcomes.length - 3} ${
                  market.outcomes.length - 3 === 1
                    ? strings('predict.outcomes_singular')
                    : strings('predict.outcomes_plural')
                }`
              : ''}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ${totalVolumeDisplay} {strings('predict.volume_abbreviated')}
            </Text>
            {market.recurrence && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Icon
                  name={IconName.Refresh}
                  size={IconSize.Sm}
                  color={TextColor.Alternative}
                  style={tw.style('mr-1')}
                />
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {market.recurrence}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </View>
  );
};

export default PredictMarketMultiple;
