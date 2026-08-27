import React, { useCallback } from 'react';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../Predict/types';
import { usePredictPreviewSheet } from '../../../Predict/contexts';
import { usePredictActionGuard } from '../../../Predict/hooks/usePredictActionGuard';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import { calculateTotalVolume } from '../../../Predict/components/FeaturedCarousel/FeaturedCarouselCard.utils';
import { strings } from '../../../../../../locales/i18n';
import CardFrame from '../CardFrame';
import { formatCompactUsd } from '../../utils/formatCompactUsd';
import { trackExploreCardsCta } from '../../utils/exploreCardsAnalytics';

export interface PredictionCardProps {
  market: PredictMarket;
  rank: number;
}

/**
 * Binary prediction market card: "% chance" hero stat + dual Yes / No CTAs
 * that open the Predict buy sheet over the deck (position is preserved).
 */
const PredictionCard: React.FC<PredictionCardProps> = ({ market, rank }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });

  // Deck only contains binary markets (filtered in useExploreCardsDeck).
  const outcome = market.outcomes[0];
  const tokens = outcome.tokens.slice(0, 2);
  const yesToken = tokens[0];

  const handleBodyPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        title: market.title,
        image: market.image,
      },
    });
  }, [navigation, market]);

  const handleBuy = useCallback(
    (buyOutcome: PredictOutcome, token: PredictOutcomeToken) => {
      trackExploreCardsCta('prediction', token.title.toLowerCase(), market.id);
      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome: buyOutcome,
            outcomeToken: token,
            entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [executeGuardedAction, openBuySheet, market],
  );

  const chancePct = Math.round((yesToken?.price ?? 0) * 100);
  const totalVolume = calculateTotalVolume(market.outcomes);

  return (
    <CardFrame
      type="prediction"
      rank={rank}
      onBodyPress={handleBodyPress}
      testID={`explore-card-prediction-${market.id}`}
      cta={
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          {tokens.map((token, index) => {
            const isYes = index === 0;
            return (
              <Box key={token.id} twClassName="flex-1">
                <Button
                  size={ButtonBaseSize.Lg}
                  isFullWidth
                  twClassName={isYes ? 'bg-success-muted' : 'bg-error-muted'}
                  onPress={() => handleBuy(outcome, token)}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={
                      isYes ? TextColor.SuccessDefault : TextColor.ErrorDefault
                    }
                    numberOfLines={1}
                  >
                    {`${token.title} ${Math.round(token.price * 100)}¢`}
                  </Text>
                </Button>
              </Box>
            );
          })}
        </Box>
      }
    >
      <Box twClassName="flex-1 items-center justify-center gap-2">
        {market.image ? (
          <Box twClassName="w-16 h-16 rounded-2xl bg-muted overflow-hidden">
            <Image
              source={{ uri: market.image }}
              style={tw.style('w-full h-full')}
              contentFit="cover"
              recyclingKey={market.image}
            />
          </Box>
        ) : null}
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          numberOfLines={3}
          twClassName="text-center mt-2"
        >
          {market.title}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.SuccessDefault}
        >
          {`${chancePct}%`}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('explore_cards.stat_chance')}
        </Text>
        <Box twClassName="items-center mt-2">
          <Text variant={TextVariant.BodySm}>
            {formatCompactUsd(totalVolume)}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('explore_cards.stat_volume')}
          </Text>
        </Box>
      </Box>
    </CardFrame>
  );
};

export default PredictionCard;
