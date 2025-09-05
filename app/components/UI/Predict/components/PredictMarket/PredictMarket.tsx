import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useMemo } from 'react';
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
import { usePredictOrder } from '../../hooks/usePredictOrder';
import { Market } from '../../types';
import { formatVolume } from '../../utils/format';
import styleSheet from './PredictMarket.styles';

interface PredictMarketProps {
  market: Market;
}

const PredictMarket: React.FC<PredictMarketProps> = ({ market }) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { placeBuyOrder, isPlacing, currentOrder, lastResult, reset } =
    usePredictBuy();
  const { status } = usePredictOrder(lastResult?.txMeta?.id);

  // TODO: Remove this once we have a new Market model that abstracts away the clobTokenIds
  const tokenIds = useMemo(() => JSON.parse(market.clobTokenIds), [market]);

  useEffect(() => {
    if (status === 'success') {
      Alert.alert('Order confirmed');
      reset();
    }
  }, [status, reset]);

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

  const getImageUrl = (): string =>
    market.image || market.icon || market.image_url || '';

  const getVolumeDisplay = (): string => formatVolume(market.volume || 0);

  const outcomeLabels = getOutcomeLabels();
  const yesPercentage = getYesPercentage();

  const handleYes = () => {
    placeBuyOrder({
      marketId: market.conditionId,
      outcomeId: tokenIds[0],
      amount: 1,
    });
  };

  const handleNo = () => {
    placeBuyOrder({
      marketId: market.conditionId,
      outcomeId: tokenIds[1],
      amount: 1,
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
            <Text style={tw.style('font-bold')} color={TextColor.Success}>
              {strings('predict.buy_yes')}
            </Text>
          }
          onPress={handleYes}
          style={styles.buttonYes}
          disabled={isPlacing}
          loading={currentOrder?.outcomeId === tokenIds[0] && isPlacing}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={
            <Text style={tw.style('font-bold')} color={TextColor.Error}>
              {strings('predict.buy_no')}
            </Text>
          }
          onPress={handleNo}
          style={styles.buttonNo}
          disabled={isPlacing}
          loading={currentOrder?.outcomeId === tokenIds[1] && isPlacing}
        />
      </View>
      <View style={styles.marketFooter}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {outcomeLabels.length} outcomes
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          ${getVolumeDisplay()} Vol.
        </Text>
      </View>
    </View>
  );
};

export default PredictMarket;
