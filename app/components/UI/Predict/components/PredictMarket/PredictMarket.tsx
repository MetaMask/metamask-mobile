import React from 'react';
import { View, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictMarket.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { Market } from '../../types';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictMarketProps {
  market: Market;
}

const PredictMarket: React.FC<PredictMarketProps> = ({ market }) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();

  const getOutcomeLabels = (): string[] => {
    try {
      if (typeof market.outcomes === 'string') {
        return JSON.parse(market.outcomes);
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const getOutcomePrices = (): number[] => {
    try {
      if (market.outcomePrices && typeof market.outcomePrices === 'string') {
        return JSON.parse(market.outcomePrices).map((price: string) =>
          parseFloat(price),
        );
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const getYesPercentage = (): number => {
    const prices = getOutcomePrices();
    if (prices.length > 0) {
      return Math.round(prices[0] * 100);
    }
    return 0;
  };

  const getTitle = (): string => market.question || 'Unknown Market';

  const getImageUrl = (): string => market.image || market.icon || market.image_url || '';

  const getVolumeDisplay = (): string => {
    if (market.volume) {
      const volume =
        typeof market.volume === 'string'
          ? parseFloat(market.volume)
          : market.volume;
      return volume.toLocaleString();
    }
    return '0';
  };

  const outcomeLabels = getOutcomeLabels();
  const yesPercentage = getYesPercentage();

  return (
    <View style={styles.marketContainer}>
      <View style={styles.marketHeader}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 gap-3"
        >
          <Box twClassName="w-12 h-12 rounded-lg bg-muted overflow-hidden">
            {getImageUrl() ? (
              <Image
                source={{ uri: getImageUrl() }}
                style={tw.style('w-full h-full')}
                resizeMode="cover"
              />
            ) : (
              <Box twClassName="w-full h-full bg-muted" />
            )}
          </Box>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={tw.style('flex-1')}
          >
            {getTitle()}
          </Text>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Success}>
            {yesPercentage}%
          </Text>
        </Box>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={
            <Text color={TextColor.Success}>{strings('predict.buy_yes')}</Text>
          }
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_DETAILS)}
          style={styles.buttonYes}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={
            <Text color={TextColor.Error}>{strings('predict.buy_no')}</Text>
          }
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_DETAILS)}
          style={styles.buttonNo}
        />
      </View>
      <View style={styles.marketFooter}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {outcomeLabels.length} Outcomes
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {getVolumeDisplay()} Vol.
        </Text>
      </View>
    </View>
  );
};

export default PredictMarket;
