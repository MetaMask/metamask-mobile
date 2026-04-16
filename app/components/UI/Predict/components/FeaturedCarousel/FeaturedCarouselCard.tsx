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

  if (market.game) {
    return (
      <FeaturedCarouselSportCard
        market={market}
        index={index}
        entryPoint={entryPoint}
      />
    );
  }

  const isBinaryMarket =
    market.outcomes.length === 1 && market.outcomes[0].tokens.length >= 2;

  interface DisplayItem {
    key: string;
    label: string;
    outcome: PredictOutcome;
    token: PredictOutcomeToken;
  }

  const displayItems: DisplayItem[] = isBinaryMarket
    ? market.outcomes[0].tokens.slice(0, 2).map((token) => ({
        key: token.id,
        label: token.title,
        outcome: market.outcomes[0],
        token,
      }))
    : market.outcomes.slice(0, 2).reduce<DisplayItem[]>((acc, outcome) => {
        const token = outcome.tokens[0];
        if (token) {
          acc.push({
            key: outcome.id,
            label: outcome.groupItemTitle || outcome.title,
            outcome,
            token,
          });
        }
        return acc;
      }, []);

  const remainingOptions = isBinaryMarket
    ? 0
    : Math.max(0, market.outcomes.length - 2);
  const totalVolume = calculateTotalVolume(market.outcomes);

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
      <Box twClassName="bg-section rounded-xl p-4 h-full justify-between">
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
            {displayItems.map((item, itemIdx) => {
              const percentage = Math.round(item.token.price * 100);

              return (
                <Box
                  key={item.key}
                  testID={FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(
                    index,
                    itemIdx,
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
                    {item.label}
                  </Text>

                  <FeaturedCarouselPayoutRow price={item.token.price} />

                  <Box twClassName="w-full mt-2">
                    <Button
                      testID={FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(
                        index,
                        itemIdx,
                      )}
                      onPress={() => handleBuy(item.outcome, item.token)}
                      twClassName="bg-success-muted"
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
