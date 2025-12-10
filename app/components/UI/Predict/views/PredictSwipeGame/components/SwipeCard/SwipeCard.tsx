import React, { useEffect } from 'react';
import { Image, StyleSheet, View, Dimensions, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';
import {
  CARD_ANIMATION,
  SWIPE_GAME_TEST_IDS,
} from '../../PredictSwipeGame.constants';
import type { SwipeCardProps } from '../../PredictSwipeGame.types';
import { formatPercentage } from '../../../../utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side
const { LEVITATE_AMPLITUDE, LEVITATE_DURATION } = CARD_ANIMATION;

/**
 * SwipeCard - The main swipeable market card (Redesigned)
 *
 * Features:
 * - Large prominent image (55% of card)
 * - Gradient overlay for text readability
 * - Title at bottom of image
 * - Odds pills inside card
 * - Subtle metadata at bottom
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  card,
  preview,
  betAmount,
  isActive,
  onOutcomeChange,
  overlay,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  // Levitating animation for active card
  const levitateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      levitateY.value = withRepeat(
        withSequence(
          withTiming(-LEVITATE_AMPLITUDE, {
            duration: LEVITATE_DURATION,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: LEVITATE_DURATION,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    } else {
      levitateY.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, levitateY]);

  const levitateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: levitateY.value }],
  }));

  // Format end date
  const formatEndDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'Ended';
      if (diffDays === 0) return 'Ends today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays <= 7) return `${diffDays} days`;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const endDateText = formatEndDate(card.endDate);

  // Get prices
  const yesPrice =
    preview?.yesPreview?.sharePrice ?? card.primaryOutcome.yesToken.price;
  const noPrice =
    preview?.noPreview?.sharePrice ?? card.primaryOutcome.noToken.price;

  // Calculate potential wins
  const yesPotentialReturn = betAmount / yesPrice;
  const noPotentialReturn = betAmount / noPrice;

  return (
    <Animated.View
      key={card.marketId}
      style={[styles.cardContainer, levitateStyle]}
    >
      <View
        style={[
          styles.cardWrapper,
          { backgroundColor: colors.background.default },
        ]}
        testID={SWIPE_GAME_TEST_IDS.CARD}
      >
        {/* ===== IMAGE SECTION (55% of card) ===== */}
        <View style={styles.imageContainer}>
          {card.image ? (
            <Image
              key={card.marketId}
              source={{ uri: card.image }}
              style={styles.image}
              resizeMode="cover"
              testID={SWIPE_GAME_TEST_IDS.CARD_IMAGE}
            />
          ) : (
            <Box twClassName="w-full h-full bg-muted items-center justify-center">
              <Text style={{ fontSize: 48 }}>🔮</Text>
            </Box>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />

          {/* End date badge */}
          {endDateText && (
            <Box
              twClassName="absolute top-3 right-3 rounded-full px-3 py-1"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <Text variant={TextVariant.BodySm} style={{ color: 'white' }}>
                ⏰ {endDateText}
              </Text>
            </Box>
          )}

          {/* Title on image */}
          <Box twClassName="absolute bottom-0 left-0 right-0 p-4">
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              style={{ color: 'white' }}
              testID={SWIPE_GAME_TEST_IDS.CARD_TITLE}
              numberOfLines={3}
            >
              {card.title}
            </Text>
          </Box>
        </View>

        {/* ===== CONTENT SECTION ===== */}
        <Box twClassName="p-5">
          {/* Primary Outcome Label */}
          {card.isMultiOutcome && (
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative mb-4">
              Betting on: {card.primaryOutcome.title}
            </Text>
          )}

          {/* ===== ODDS PILLS (Side by side) ===== */}
          <Box twClassName="flex-row gap-3">
            {/* NO Pill */}
            <View style={styles.oddsPillNo}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                style={{ color: colors.error.default }}
              >
                NO
              </Text>
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
              >
                {formatPercentage(noPrice)}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                style={{ color: colors.success.default }}
              >
                +${(noPotentialReturn - betAmount).toFixed(2)}
              </Text>
            </View>

            {/* YES Pill */}
            <View style={styles.oddsPillYes}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                style={{ color: colors.success.default }}
              >
                YES
              </Text>
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
              >
                {formatPercentage(yesPrice)}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                style={{ color: colors.success.default }}
              >
                +${(yesPotentialReturn - betAmount).toFixed(2)}
              </Text>
            </View>
          </Box>

          {/* ===== METADATA ===== */}
          <Box twClassName="flex-row items-center justify-center gap-2 mt-4">
            <Text variant={TextVariant.BodySm} twClassName="text-muted">
              Vol: $
              {card.totalVolume >= 1000000
                ? `${(card.totalVolume / 1000000).toFixed(1)}M`
                : card.totalVolume >= 1000
                  ? `${(card.totalVolume / 1000).toFixed(0)}k`
                  : card.totalVolume.toFixed(0)}
            </Text>
            {card.tags.length > 0 && (
              <>
                <Text variant={TextVariant.BodySm} twClassName="text-muted">
                  •
                </Text>
                <Text variant={TextVariant.BodySm} twClassName="text-muted">
                  {card.tags[0]}
                </Text>
              </>
            )}
          </Box>

          {/* Alternative outcomes - selectable squares */}
          {card.isMultiOutcome && card.alternativeOutcomes.length > 0 && (
            <>
              <Box twClassName="mt-3 mb-1" style={styles.metadataSection} />
              <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.alternativesScroll}
              contentContainerStyle={styles.alternativesContainer}
            >
              {card.alternativeOutcomes.slice(0, 4).map((outcome) => (
                <Pressable
                  key={outcome.outcomeId}
                  onPress={() => onOutcomeChange?.(outcome.outcomeId)}
                  style={({ pressed }) => [
                    styles.alternativeCard,
                    pressed && styles.alternativeCardPressed,
                  ]}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={2}
                    style={styles.alternativeTitle}
                  >
                    {outcome.title}
                  </Text>
                  <Box twClassName="flex-row items-center mt-2">
                    <Text style={styles.yesTextSmall}>
                      {formatPercentage(outcome.yesToken.price)}
                    </Text>
                    <Text style={styles.slashText}>/</Text>
                    <Text style={styles.noTextSmall}>
                      {formatPercentage(outcome.noToken.price)}
                    </Text>
                  </Box>
                </Pressable>
              ))}
              {card.alternativeOutcomes.length > 4 && (
                <Box style={styles.moreCard}>
                  <Text variant={TextVariant.BodyMd} twClassName="text-muted">
                    +{card.alternativeOutcomes.length - 4}
                  </Text>
                </Box>
              )}
            </ScrollView>
            </>
          )}
        </Box>

        {/* Overlay (swipe feedback) - rendered inside cardWrapper for perfect fit */}
        {overlay}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    maxWidth: 400,
    // MetaMask orange shadow for brand feel
    shadowColor: '#F6851B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  oddsPillNo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(215, 58, 73, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(215, 58, 73, 0.15)',
  },
  oddsPillYes: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(40, 167, 69, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(40, 167, 69, 0.15)',
  },
  metadataSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  alternativesScroll: {
    marginTop: 12,
  },
  alternativesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  alternativeCard: {
    width: 100,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  alternativeCardPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  alternativeTitle: {
    minHeight: 32,
  },
  yesText: {
    color: '#16A34A',
  },
  noText: {
    color: '#DC2626',
  },
  yesTextSmall: {
    fontSize: 12,
    color: '#16A34A',
  },
  noTextSmall: {
    fontSize: 12,
    color: '#DC2626',
  },
  slashText: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 2,
  },
  moreCard: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SwipeCard;
