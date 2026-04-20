import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import type {
  PredictMarket,
  PredictOutcome,
} from '../../../../../UI/Predict/types';
import type { PredictNavigationParamList } from '../../../../../UI/Predict/types/navigation';

interface PredictMarketCardProps {
  market: PredictMarket;
}

const MAX_OUTCOMES_DISPLAYED = 2;

/**
 * Format price as percentage (e.g., 0.55 -> "55%")
 */
const formatPrice = (price: number): string => {
  const pct = Math.round(price * 100);
  return `${pct}%`;
};

/**
 * OutcomeRow - Single outcome row with image, name, and percentage
 */
const OutcomeRow: React.FC<{
  outcome: PredictOutcome;
}> = ({ outcome }) => {
  const tw = useTailwind();
  const yesToken = outcome.tokens?.[0];
  const price = yesToken?.price ?? 0;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
    >
      {/* Outcome image */}
      <Box twClassName="w-6 h-6 rounded-lg overflow-hidden bg-background-alternative">
        {outcome.image ? (
          <Image
            source={{ uri: outcome.image }}
            style={tw.style('w-6 h-6')}
            resizeMode="cover"
          />
        ) : null}
      </Box>

      {/* Outcome title - flex to fill space */}
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {outcome.groupItemTitle || outcome.title}
        </Text>
      </Box>

      {/* Percentage */}
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {formatPrice(price)}
      </Text>
    </Box>
  );
};

/**
 * Compact prediction market card for homepage carousel.
 * Shows title and top 2 outcomes with prices.
 */
const PredictMarketCard: React.FC<PredictMarketCardProps> = ({ market }) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: { marketId: market.id },
    });
  }, [navigation, market.id]);

  // Get top outcomes to display
  const displayOutcomes = useMemo(() => {
    if (!market.outcomes?.length) {
      return [];
    }
    // For markets with multiple outcomes, show top 2
    if (market.outcomes.length > 1) {
      return market.outcomes.slice(0, MAX_OUTCOMES_DISPLAYED);
    }
    // For single outcome markets, show the tokens as separate rows
    const outcome = market.outcomes[0];
    if (outcome?.tokens?.length >= 2) {
      // Create pseudo-outcomes from tokens (Yes/No)
      return outcome.tokens
        .slice(0, MAX_OUTCOMES_DISPLAYED)
        .map((token, index) => ({
          ...outcome,
          id: `${outcome.id}-${index}`,
          title: token.title,
          groupItemTitle: token.title,
          tokens: [token],
        }));
    }
    return market.outcomes.slice(0, MAX_OUTCOMES_DISPLAYED);
  }, [market.outcomes]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <Box
        twClassName="w-[240px] rounded-2xl bg-background-muted flex-1"
        padding={4}
        gap={6}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Header: Title */}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {market.title}
        </Text>

        {/* Outcomes */}
        <Box gap={2}>
          {displayOutcomes.map((outcome) => (
            <OutcomeRow key={outcome.id} outcome={outcome} />
          ))}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PredictMarketCard;
