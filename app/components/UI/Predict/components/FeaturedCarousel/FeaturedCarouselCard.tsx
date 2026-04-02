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
import { formatPercentage } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictNavigation } from '../../hooks/usePredictNavigation';
import FeaturedCarouselSportCard from './FeaturedCarouselSportCard';
import FeaturedCarouselCardFooter from './FeaturedCarouselCardFooter';
import FeaturedCarouselPayoutRow from './FeaturedCarouselPayoutRow';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';
import cardStyleSheet from './FeaturedCarouselCard.styles';
import { calculateTotalVolume } from './FeaturedCarouselCard.utils';

interface FeaturedCarouselCardProps {
  market: PredictMarket;
  index: number;
  entryPoint?: PredictEntryPoint;
}

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
  const remainingOptions = Math.max(0, market.outcomes.length - 2);
  const totalVolume = calculateTotalVolume(market.outcomes);

  if (market.game) {
    return (
      <FeaturedCarouselSportCard
        market={market}
        index={index}
        entryPoint={entryPoint}
      />
    );
  }

  const formattedEndDate = market.endDate
    ? new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(market.endDate))
    : null;

  return (
    <TouchableOpacity
      testID={FEATURED_CAROUSEL_TEST_IDS.CARD(index)}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Box style={styles.cardContainer}>
        <Box twClassName="flex-1">
          {market.image && (
            <Box alignItems={BoxAlignItems.Center} twClassName="mb-3">
              <Box twClassName="w-6 h-6 rounded-lg bg-muted overflow-hidden">
                <Image
                  source={{ uri: market.image }}
                  style={tw.style('w-full h-full')}
                  resizeMode="cover"
                />
              </Box>
            </Box>
          )}

          <Text
            testID={FEATURED_CAROUSEL_TEST_IDS.CARD_TITLE(index)}
            variant={TextVariant.HeadingMd}
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
              const percentage = Math.round(token.price * 100);

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
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                  >
                    {outcome.groupItemTitle || outcome.title}
                  </Text>

                  <FeaturedCarouselPayoutRow price={token.price} />

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
                      size={ButtonBaseSize.Lg}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        style={tw.style('font-medium')}
                        color={TextColor.SuccessDefault}
                        numberOfLines={1}
                      >
                        {formatPercentage(percentage)}
                      </Text>
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <FeaturedCarouselCardFooter
          testID={FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(index)}
          remainingOptions={remainingOptions}
          timeText={formattedEndDate}
          totalVolume={totalVolume}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default FeaturedCarouselCard;
