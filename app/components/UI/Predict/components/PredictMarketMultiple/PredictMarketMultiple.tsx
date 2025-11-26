import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import Routes from '../../../../../constants/navigation/Routes';
import { PREDICT_CONSTANTS } from '../../constants/errors';
import { ensureError } from '../../utils/predictErrorHandler';
import {
  PredictMarket,
  Recurrence,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { formatPercentage, formatVolume } from '../../utils/format';
import styleSheet from './PredictMarketMultiple.styles';
interface PredictMarketMultipleProps {
  market: PredictMarket;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}

const PredictMarketMultiple: React.FC<PredictMarketMultipleProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isCarousel = false,
}) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { styles } = useStyles(styleSheet, { isCarousel });
  const tw = useTailwind();

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  // filter resolved outcomes
  const filteredOutcomes = market.outcomes.filter(
    (outcome) => outcome.tokens[0].price !== 0 && outcome.tokens[0].price !== 1,
  );

  const getOutcomePercentage = (
    outcomePrices?: number[],
  ): string | undefined => {
    if (!outcomePrices) {
      return undefined;
    }

    try {
      const parsed = outcomePrices;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstValue = parsed[0];
        return formatPercentage(firstValue * 100, { truncate: true });
      }
    } catch (error) {
      DevLogger.log('PredictMarketMultiple: Failed to parse outcomePrices', {
        outcomePrices,
        error,
      });

      Logger.error(ensureError(error), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'PredictMarketMultiple',
        },
        context: {
          name: 'PredictMarketMultiple',
          data: {
            method: 'parseOutcomePrices',
            action: 'parse_outcome_prices',
            operation: 'market_display',
            marketId: market.id,
            marketTitle: market.title,
            outcomePrices,
          },
        },
      });
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

  const handleBuy = (
    outcome: PredictOutcome,
    outcomeToken: PredictOutcomeToken,
  ) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome,
            outcomeToken,
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

  const totalVolumeDisplay = formatVolume(totalVolume);

  const truncateLabel = (label: string): string =>
    label.length > 3 ? `${label.substring(0, 3)}` : label;

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
            image: market.image,
          },
        });
      }}
    >
      <View style={styles.marketContainer}>
        <Box twClassName={isCarousel ? 'flex-1' : ''}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName={isCarousel ? 'mb-2 gap-2' : 'mb-3 gap-4'}
          >
            <Box
              twClassName={`${isCarousel ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-muted overflow-hidden`}
            >
              {market.image && (
                <Box twClassName="w-full h-full">
                  <Image
                    source={{ uri: market.image }}
                    style={tw.style('w-full h-full')}
                    resizeMode="cover"
                  />
                </Box>
              )}
            </Box>
            <Box twClassName="flex-1">
              <Text
                variant={
                  isCarousel ? TextVariant.BodyMDMedium : TextVariant.HeadingSM
                }
                color={TextColor.Default}
                style={tw.style(
                  isCarousel
                    ? 'font-medium leading-[20px]'
                    : 'font-medium leading-[24px]',
                )}
                numberOfLines={isCarousel ? 2 : undefined}
              >
                {market.title}
              </Text>
            </Box>
          </Box>
          {filteredOutcomes.slice(0, 3).map((outcome) => {
            const outcomeLabels = outcome.tokens.map((token) => token.title);
            return (
              <Box
                key={`${outcome.id}`}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName={isCarousel ? 'py-0.5 gap-2' : 'py-1 gap-4'}
              >
                <Box twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Default}
                    numberOfLines={1}
                    style={tw.style(
                      isCarousel ? 'leading-[16px]' : 'leading-[18px]',
                    )}
                  >
                    {outcome.groupItemTitle}
                  </Text>
                </Box>

                <Box>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Alternative}
                  >
                    {getOutcomePercentage(
                      outcome.tokens.map((token) => token.price),
                    ) ?? '0'}
                  </Text>
                </Box>

                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName={isCarousel ? 'gap-1' : 'gap-2'}
                >
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={isCarousel ? ButtonSize.Sm : ButtonSize.Md}
                    label={
                      <Text
                        variant={TextVariant.BodySM}
                        style={tw.style('font-medium')}
                        color={TextColor.Success}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                      >
                        {truncateLabel(outcomeLabels[0])}
                      </Text>
                    }
                    onPress={() => handleBuy(outcome, outcome.tokens[0])}
                    style={styles.buttonYes}
                  />
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={isCarousel ? ButtonSize.Sm : ButtonSize.Md}
                    width={ButtonWidthTypes.Full}
                    label={
                      <Text
                        variant={
                          isCarousel ? TextVariant.BodyXS : TextVariant.BodySM
                        }
                        style={tw.style('font-medium')}
                        color={TextColor.Error}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                      >
                        {truncateLabel(outcomeLabels[1])}
                      </Text>
                    }
                    onPress={() => handleBuy(outcome, outcome.tokens[1])}
                    style={styles.buttonNo}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName={isCarousel ? '' : 'mt-3'}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {filteredOutcomes.length > 3
              ? `+${filteredOutcomes.length - 3} ${
                  filteredOutcomes.length - 3 === 1
                    ? strings('predict.outcomes_singular')
                    : strings('predict.outcomes_plural')
                }`
              : ''}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4"
          >
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ${totalVolumeDisplay} {strings('predict.volume_abbreviated')}
            </Text>
            {market.recurrence && market.recurrence !== Recurrence.NONE && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Icon
                  name={IconName.Refresh}
                  size={IconSize.Md}
                  color={TextColor.Alternative}
                  style={tw.style('mr-1')}
                />
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings(
                    `predict.recurrence.${market.recurrence.toLowerCase()}`,
                  )}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </View>
    </TouchableOpacity>
  );
};

export default PredictMarketMultiple;
