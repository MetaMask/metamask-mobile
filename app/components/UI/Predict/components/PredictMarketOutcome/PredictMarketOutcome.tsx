import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Alert, Image, View } from 'react-native';
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
import { usePredictBuy } from '../../hooks/usePredictBuy';
import { PredictOutcome as PredictOutcomeType } from '../../types';
import { formatVolume, formatPercentage } from '../../utils/format';
import styleSheet from './PredictMarketOutcome.styles';
interface PredictMarketOutcomeProps {
  outcome: PredictOutcomeType;
}

const PredictMarketOutcome: React.FC<PredictMarketOutcomeProps> = ({
  outcome,
}) => {
  // const outcome = market.outcomes[0];
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { reset, loading, currentOrderParams } = usePredictBuy({
    onError: (error) => {
      Alert.alert('Order failed', error);
      reset();
    },
  });

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

  const isOutcomeTokenLoading = useCallback(
    (outcomeTokenId: string) =>
      currentOrderParams?.outcomeTokenId === outcomeTokenId && loading,
    [currentOrderParams, loading],
  );

  const handleYes = () => {
    // TODO: Implement buy yes functionality
  };

  const handleNo = () => {
    // TODO: Implement buy no functionality
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
          disabled={loading}
          loading={isOutcomeTokenLoading(outcome.tokens[0].id)}
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
          disabled={loading}
          loading={isOutcomeTokenLoading(outcome.tokens[1].id)}
        />
      </View>
    </View>
  );
};

export default PredictMarketOutcome;
