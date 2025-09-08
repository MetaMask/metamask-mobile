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
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import styleSheet from './PredictMarket.styles';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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

  interface SemiCircleYesPercentageProps {
    percentage: number;
    size?: number;
    compensateCaps?: boolean;
    startAngle?: number;
  }

  const SemiCircleYesPercentage = ({
    percentage,
    size = 40,
    compensateCaps = true,
    startAngle = 180,
  }: SemiCircleYesPercentageProps) => {
    const { theme } = useStyles(() => ({}), {});
    const radius = size / 2;
    const strokeWidth = 4;

    const fullCircumference = 2 * Math.PI * (radius - strokeWidth / 2);
    const semiCircumference = fullCircumference / 2;

    let progress = Math.min(Math.max(percentage, 0), 100) / 100;

    if (compensateCaps && progress > 0) {
      const capCompensation = strokeWidth / radius;
      const adjustment = capCompensation / Math.PI / 2;
      progress = Math.min(progress, 1 - adjustment);
    }

    const backgroundDasharray = `${semiCircumference} ${fullCircumference}`;
    const progressDasharray = `${
      semiCircumference * progress
    } ${fullCircumference}`;

    return (
      <Box
        twClassName="relative items-center justify-center"
        style={{ width: size, height: size / 2 }}
      >
        <Svg width={size} height={size / 2} style={tw.style('absolute')}>
          <Defs>
            <LinearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor={theme.colors.success.default} />
              <Stop offset="100%" stopColor={theme.colors.success.default} />
            </LinearGradient>
          </Defs>

          {/* Background semi-circle */}
          <Circle
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            stroke={theme.colors.border.muted}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={backgroundDasharray}
            transform={`rotate(${startAngle} ${radius} ${radius})`}
          />

          {/* Progress arc */}
          <Circle
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={progressDasharray}
            transform={`rotate(${startAngle} ${radius} ${radius})`}
            strokeLinecap="round"
          />
        </Svg>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Success}
          style={[tw.style('absolute'), { top: radius - 18 }]}
        >
          {percentage}%
        </Text>
      </Box>
    );
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
          <View style={styles.yesPercentageContainer}>
            <SemiCircleYesPercentage percentage={yesPercentage} size={78} />
          </View>
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
          ${getVolumeDisplay()} {strings('predict.volume_abbreviated')}
        </Text>
      </View>
    </View>
  );
};

export default PredictMarket;
