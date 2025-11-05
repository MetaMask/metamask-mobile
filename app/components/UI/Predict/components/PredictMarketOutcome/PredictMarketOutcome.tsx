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
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket,
  PredictOutcomeToken,
  PredictOutcome as PredictOutcomeType,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { formatPercentage, formatVolume } from '../../utils/format';
import styleSheet from './PredictMarketOutcome.styles';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
interface PredictMarketOutcomeProps {
  market: PredictMarket;
  outcome: PredictOutcomeType;
  entryPoint?: PredictEntryPoint;
  outcomeToken?: PredictOutcomeToken;
  isClosed?: boolean;
}

const PredictMarketOutcome: React.FC<PredictMarketOutcomeProps> = ({
  market,
  outcome,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isClosed = false,
  outcomeToken,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
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

  const getTitle = (): string => {
    if (isClosed && outcomeToken) {
      return outcomeToken.title;
    }
    return outcome.groupItemTitle || outcome.title || '';
  };

  const getImageUrl = (): string => outcome.image;

  const getVolumeDisplay = (): string => formatVolume(outcome.volume ?? 0);

  const handleBuy = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome,
            outcomeToken: token,
            entryPoint,
          },
        });
      },
      { checkBalance: true },
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
          <View style={tw.style('flex-1')}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Text
                variant={TextVariant.HeadingMD}
                color={TextColor.Default}
                style={tw.style('font-medium')}
              >
                {getTitle()}
              </Text>
            </Box>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ${getVolumeDisplay()} {strings('predict.volume_abbreviated')}
            </Text>
          </View>
          <Text>
            {isClosed && outcomeToken ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
              >
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={
                    outcomeToken.price === 1
                      ? TextColor.Default
                      : TextColor.Alternative
                  }
                >
                  {outcomeToken.price === 1
                    ? strings('predict.outcome_winner')
                    : strings('predict.outcome_loser')}
                </Text>
                {outcomeToken.price === 1 && (
                  <Icon
                    name={IconName.Confirmation}
                    size={IconSize.Md}
                    color={
                      outcomeToken.price === 1
                        ? TextColor.Success
                        : TextColor.Muted
                    }
                  />
                )}
              </Box>
            ) : (
              <Text
                style={tw.style('text-[20px] font-medium')}
                color={TextColor.Default}
              >
                {getYesPercentage()}
              </Text>
            )}
          </Text>
        </Box>
      </View>
      {!isClosed && (
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text style={tw.style('font-medium')} color={TextColor.Success}>
                {outcome.tokens[0].title} •{' '}
                {(outcome.tokens[0].price * 100).toFixed(2)}¢
              </Text>
            }
            onPress={() => handleBuy(outcome.tokens[0])}
            style={styles.buttonYes}
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text style={tw.style('font-medium')} color={TextColor.Error}>
                {outcome.tokens[1].title} •{' '}
                {(outcome.tokens[1].price * 100).toFixed(2)}¢
              </Text>
            }
            onPress={() => handleBuy(outcome.tokens[1])}
            style={styles.buttonNo}
          />
        </View>
      )}
    </View>
  );
};

export default PredictMarketOutcome;
