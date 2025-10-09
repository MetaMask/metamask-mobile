import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
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
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket,
  PredictOutcome as PredictOutcomeType,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatVolume } from '../../utils/format';
import styleSheet from './PredictMarketOutcome.styles';
interface PredictMarketOutcomeProps {
  market: PredictMarket;
  outcome: PredictOutcomeType;
}

const PredictMarketOutcome: React.FC<PredictMarketOutcomeProps> = ({
  market,
  outcome,
}) => {
  // const outcome = market.outcomes[0];
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const getOutcomePrices = (): number[] =>
    outcome.tokens.map((token) => token.price);

  const getYesPercentage = (): string => {
    const prices = getOutcomePrices();
    if (prices.length > 0) {
      return formatPercentage(prices[0] * 100);
    }
    return '0%';
  };

  const getTitle = (): string => outcome.groupItemTitle ?? 'Unknown Market';

  const getImageUrl = (): string => outcome.image;

  const getVolumeDisplay = (): string => formatVolume(outcome.volume ?? 0);

  const handleYes = () => {
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.PLACE_BET,
      params: {
        market,
        outcome,
        outcomeToken: outcome.tokens[0],
      },
    });
  };

  const handleNo = () => {
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.PLACE_BET,
      params: {
        market,
        outcome,
        outcomeToken: outcome.tokens[1],
      },
    });
  };

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
          <View style={tw.style('flex-1')}>
            <Text
              variant={TextVariant.HeadingMD}
              color={TextColor.Default}
              style={tw.style('font-medium')}
            >
              {getTitle()}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ${getVolumeDisplay()} {strings('predict.volume_abbreviated')}
            </Text>
          </View>
          <Text>{getYesPercentage()}</Text>
        </Box>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          label={
            <Text style={tw.style('font-medium')} color={TextColor.Success}>
              {strings('predict.buy_yes')} •{' '}
              {(outcome.tokens[0].price * 100).toFixed(2)}¢
            </Text>
          }
          onPress={handleYes}
          style={styles.buttonYes}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          label={
            <Text style={tw.style('font-medium')} color={TextColor.Error}>
              {strings('predict.buy_no')} •{' '}
              {(outcome.tokens[1].price * 100).toFixed(2)}¢
            </Text>
          }
          onPress={handleNo}
          style={styles.buttonNo}
        />
      </View>
    </View>
  );
};

export default PredictMarketOutcome;
