import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket as PredictMarketType,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { formatVolume } from '../../utils/format';
import styleSheet from './PredictMarketSingle.styles';

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
  const tw = useTailwind();
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
      twClassName="relative items-center justify-end"
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
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        style={tw.style('-mb-1.5')}
      >
        {percentage}%
      </Text>
    </Box>
  );
};

interface PredictMarketSingleProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}

const PredictMarketSingle: React.FC<PredictMarketSingleProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isCarousel = false,
}) => {
  const outcome = market.outcomes[0];
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { styles } = useStyles(styleSheet, { isCarousel });
  const tw = useTailwind();

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const getOutcomePrices = (): number[] =>
    outcome.tokens.map((token) => token.price);

  const getYesPercentage = (): number => {
    const prices = getOutcomePrices();
    if (prices.length === 0) {
      return 0;
    }

    const yesPrice = Number(prices[0]);

    if (!Number.isFinite(yesPrice)) {
      return 0;
    }

    return Math.round(yesPrice * 100);
  };

  const getTitle = (): string => outcome.title ?? 'Unknown Market';

  const getImageUrl = (): string => outcome.image;

  const getVolumeDisplay = (): string => formatVolume(outcome.volume ?? 0);

  const yesPercentage = getYesPercentage();

  const handleBuy = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome,
            outcomeToken: token,
            entryPoint,
          },
        });
      },
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: market.id,
            entryPoint,
            title: market.title,
            image: getImageUrl(),
          },
        });
      }}
    >
      <View style={styles.marketContainer}>
        <View style={styles.marketHeader}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1 gap-3"
          >
            <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
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
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              style={tw.style('flex-1 font-medium')}
              numberOfLines={2}
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
            size={isCarousel ? ButtonSize.Sm : ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text
                variant={
                  isCarousel ? TextVariant.BodyXSMedium : TextVariant.BodySM
                }
                style={tw.style('font-medium')}
                color={TextColor.Success}
              >
                {outcome.tokens[0].title}
              </Text>
            }
            onPress={() => handleBuy(outcome.tokens[0])}
            style={styles.buttonYes}
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={isCarousel ? ButtonSize.Sm : ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text
                variant={isCarousel ? TextVariant.BodyXS : TextVariant.BodySM}
                style={tw.style('font-medium')}
                color={TextColor.Error}
              >
                {outcome.tokens[1].title}
              </Text>
            }
            onPress={() => handleBuy(outcome.tokens[1])}
            style={styles.buttonNo}
          />
        </View>
        <View style={styles.marketFooter}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            ${getVolumeDisplay()} {strings('predict.volume_abbreviated')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PredictMarketSingle;
