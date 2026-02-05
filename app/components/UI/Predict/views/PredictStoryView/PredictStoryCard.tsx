import React, { useMemo } from 'react';
import { Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { PredictStoryCardProps } from './PredictStoryView.types';
import { strings } from '../../../../../../locales/i18n';
import { formatVolume, formatPercentage } from '../../utils/format';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Maximum outcomes to display in the story view
const MAX_OUTCOMES_DISPLAY = 4;

/**
 * Full-screen prediction market card component for the story view.
 * Displays market information with outcomes and animations when becoming active.
 */
const PredictStoryCard = ({
  market,
  isActive,
  onViewDetails,
  index,
  totalCount,
}: PredictStoryCardProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Filter valid outcomes (exclude resolved ones with 0% or 100%)
  const validOutcomes = useMemo(
    () =>
      market.outcomes.filter(
        (outcome) =>
          outcome.tokens[0]?.price !== 0 && outcome.tokens[0]?.price !== 1,
      ),
    [market.outcomes],
  );

  // Get top outcomes to display
  const displayOutcomes = useMemo(
    () => validOutcomes.slice(0, MAX_OUTCOMES_DISPLAY),
    [validOutcomes],
  );

  const remainingOutcomes = validOutcomes.length - MAX_OUTCOMES_DISPLAY;

  // Animated style for the content
  const contentAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: withSpring(isActive ? 1 : 0.3, { damping: 15, stiffness: 150 }),
      transform: [
        {
          scale: withSpring(isActive ? 1 : 0.95, { damping: 15, stiffness: 150 }),
        },
      ],
    }),
    [isActive],
  );

  // Format recurrence label
  const recurrenceLabel = useMemo(() => {
    if (!market.recurrence) return null;
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };
    return labels[market.recurrence] || null;
  }, [market.recurrence]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
    >
      <Animated.View
        style={[tw.style('flex-1 px-4'), contentAnimatedStyle]}
      >
        {/* Top spacing for safe area */}
        <Box style={{ height: insets.top + 60 }} />

        {/* Market Image */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-6">
          <Animated.View
            entering={isActive ? FadeIn.delay(100).duration(300) : undefined}
          >
            <Box twClassName="w-20 h-20 rounded-2xl overflow-hidden bg-muted">
              {market.image && (
                <Image
                  source={{ uri: market.image }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                />
              )}
            </Box>
          </Animated.View>
        </Box>

        {/* Market Title */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4 px-4">
          <Animated.View
            entering={isActive ? FadeInDown.delay(150).duration(300) : undefined}
          >
            <Text
              variant={TextVariant.HeadingMD}
              fontWeight={FontWeight.Bold}
              color={TextColor.Default}
              twClassName="text-center"
              numberOfLines={3}
            >
              {market.title}
            </Text>
          </Animated.View>
        </Box>

        {/* Volume & Recurrence */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="mb-6 gap-4"
        >
          <Animated.View
            entering={isActive ? FadeInDown.delay(200).duration(300) : undefined}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {formatVolume(market.volume)} Vol.
              </Text>
            </Box>
          </Animated.View>

          {recurrenceLabel && (
            <Animated.View
              entering={isActive ? FadeInDown.delay(250).duration(300) : undefined}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Icon
                  name={IconName.Refresh}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  twClassName="ml-1"
                >
                  {recurrenceLabel}
                </Text>
              </Box>
            </Animated.View>
          )}
        </Box>

        {/* Outcomes List */}
        <Box twClassName="mb-4">
          {displayOutcomes.map((outcome, outcomeIndex) => {
            const yesToken = outcome.tokens.find((t) => t.title === 'Yes');
            const noToken = outcome.tokens.find((t) => t.title === 'No');
            const percentage = yesToken
              ? formatPercentage(yesToken.price * 100, { truncate: true })
              : '--';

            return (
              <Animated.View
                key={outcome.id}
                entering={
                  isActive
                    ? FadeInDown.delay(300 + outcomeIndex * 50).duration(300)
                    : undefined
                }
              >
                <Box
                  twClassName="bg-muted rounded-xl p-4 mb-3"
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.SpaceBetween}
                >
                  {/* Outcome title and percentage */}
                  <Box twClassName="flex-1 mr-4">
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      color={TextColor.Default}
                      numberOfLines={2}
                    >
                      {outcome.groupItemTitle || outcome.title}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                      twClassName="mt-1"
                    >
                      {percentage}
                    </Text>
                  </Box>

                  {/* Yes/No buttons */}
                  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
                    <Box twClassName="bg-success-muted rounded-lg px-4 py-2">
                      <Text
                        variant={TextVariant.BodySMMedium}
                        color={TextColor.Success}
                      >
                        Yes
                      </Text>
                    </Box>
                    <Box twClassName="bg-error-muted rounded-lg px-4 py-2">
                      <Text
                        variant={TextVariant.BodySMMedium}
                        color={TextColor.Error}
                      >
                        No
                      </Text>
                    </Box>
                  </Box>
                </Box>
              </Animated.View>
            );
          })}

          {/* Show remaining outcomes count */}
          {remainingOutcomes > 0 && (
            <Animated.View
              entering={
                isActive
                  ? FadeInDown.delay(300 + MAX_OUTCOMES_DISPLAY * 50).duration(300)
                  : undefined
              }
            >
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Primary}
                twClassName="text-center mt-2"
              >
                +{remainingOutcomes} outcomes
              </Text>
            </Animated.View>
          )}
        </Box>

        {/* Spacer */}
        <Box twClassName="flex-1" />

        {/* View Details Button */}
        <Box twClassName="mb-4">
          <Animated.View
            entering={isActive ? FadeInDown.delay(450).duration(300) : undefined}
          >
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              label={strings('predict.story.view_market')}
              onPress={onViewDetails}
              twClassName="w-full"
            />
          </Animated.View>
        </Box>

        {/* Swipe hint */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Animated.View
            entering={isActive ? FadeInDown.delay(500).duration(300) : undefined}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Icon
                name={IconName.SwapVertical}
                size={IconSize.Sm}
                color={IconColor.Alternative}
              />
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                twClassName="ml-2"
              >
                {strings('predict.story.swipe_to_browse', {
                  current: index + 1,
                  total: totalCount,
                })}
              </Text>
            </Box>
          </Animated.View>
        </Box>

        {/* Bottom spacing for safe area */}
        <Box style={{ height: insets.bottom + 20 }} />
      </Animated.View>
    </Box>
  );
};

export default React.memo(PredictStoryCard);
