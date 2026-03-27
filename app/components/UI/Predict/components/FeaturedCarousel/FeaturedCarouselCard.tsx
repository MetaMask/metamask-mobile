import React, { useCallback } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { formatVolume, formatPrice } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictNavigation } from '../../hooks/usePredictNavigation';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';
import cardStyleSheet from './FeaturedCarouselCard.styles';

interface FeaturedCarouselCardProps {
  market: PredictMarket;
  index: number;
  entryPoint?: PredictEntryPoint;
}

const BET_AMOUNT = 100;

const getPayoutDisplay = (price: number): string => {
  if (price <= 0 || price >= 1) return formatPrice(BET_AMOUNT);
  const payout = BET_AMOUNT / price;
  return formatPrice(payout);
};

const FeaturedCarouselCard: React.FC<FeaturedCarouselCardProps> = ({
  market,
  index,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigateToBuyPreview } = usePredictNavigation();
  const { styles } = useStyles(cardStyleSheet, {});
  const { executeGuardedAction } = usePredictActionGuard({ navigation });

  const handleCardPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint,
        title: market.title,
        image: market.image,
      },
    });
  }, [market, entryPoint, navigation]);

  const handleBuy = useCallback(
    (outcome: PredictOutcome, token: PredictOutcomeToken) => {
      executeGuardedAction(
        () => {
          navigateToBuyPreview(
            {
              market,
              outcome,
              outcomeToken: token,
              entryPoint,
            },
            { throughRoot: true },
          );
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [market, entryPoint, executeGuardedAction, navigateToBuyPreview],
  );

  const displayOutcomes = market.outcomes.slice(0, 2);
  const totalOutcomes = market.outcomes.reduce(
    (sum, o) => sum + o.tokens.length,
    0,
  );
  const remainingOptions = Math.max(0, totalOutcomes - 2);

  const totalVolume = market.outcomes.reduce((sum, outcome) => {
    const vol =
      typeof outcome.volume === 'string'
        ? parseFloat(outcome.volume)
        : outcome.volume || 0;
    return sum + vol;
  }, 0);

  return (
    <TouchableOpacity
      testID={FEATURED_CAROUSEL_TEST_IDS.CARD(index)}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Box style={styles.cardContainer}>
        <Box twClassName="flex-1">
          <Text
            testID={FEATURED_CAROUSEL_TEST_IDS.CARD_TITLE(index)}
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={2}
            twClassName="text-center mb-4"
          >
            {market.title}
          </Text>

          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Center}
            twClassName="gap-6"
          >
            {displayOutcomes.map((outcome, outcomeIdx) => {
              const token = outcome.tokens[0];
              if (!token) return null;

              return (
                <Box
                  key={outcome.id}
                  testID={FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(
                    index,
                    outcomeIdx,
                  )}
                  alignItems={BoxAlignItems.Center}
                  twClassName="flex-1"
                >
                  <Box twClassName="w-10 h-10 rounded-full bg-muted overflow-hidden mb-2">
                    {outcome.image ? (
                      <Image
                        source={{ uri: outcome.image }}
                        style={tw.style('w-full h-full')}
                        resizeMode="cover"
                      />
                    ) : (
                      <Box twClassName="w-full h-full bg-muted" />
                    )}
                  </Box>

                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                  >
                    {outcome.groupItemTitle || outcome.title}
                  </Text>

                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.SuccessDefault}
                    twClassName="mt-1"
                  >
                    {formatPrice(BET_AMOUNT)} {String.fromCharCode(0x2192)}{' '}
                    {getPayoutDisplay(token.price)}
                  </Text>

                  <Box twClassName="w-full mt-2">
                    <Button
                      testID={FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(
                        index,
                        outcomeIdx,
                      )}
                      onPress={() => handleBuy(outcome, token)}
                      style={{
                        backgroundColor: styles.buyButton.backgroundColor,
                      }}
                      isFullWidth
                      size={ButtonBaseSize.Md}
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        style={tw.style('font-medium')}
                        color={TextColor.SuccessDefault}
                      >
                        {`${strings('predict.buy')} ${outcome.groupItemTitle || outcome.title}`}
                      </Text>
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box
          testID={FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(index)}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
          twClassName="mt-4"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {remainingOptions > 0
              ? `+ ${remainingOptions} ${
                  remainingOptions === 1
                    ? strings('predict.outcomes_singular')
                    : strings('predict.outcomes_plural')
                }`
              : ''}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            ${formatVolume(totalVolume)} {strings('predict.volume_abbreviated')}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default FeaturedCarouselCard;
