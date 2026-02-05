import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
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
import { TokenStoryCardProps } from './TokenStoryView.types';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';
import { strings } from '../../../../../locales/i18n';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Full-screen token card component for the story view.
 * Displays token information with animations when becoming active.
 */
const TokenStoryCard = ({
  token,
  isActive,
  onViewDetails,
  index,
  totalCount,
}: TokenStoryCardProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const privacyMode = useSelector(selectPrivacyMode);

  // Parse percentage change
  const percentageChange = useMemo(() => {
    const change = token.pricePercentChange1d;
    if (change === undefined || change === null) return null;

    const isPositive = change >= 0;
    const formatted = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    const color = isPositive ? TextColor.Success : TextColor.Error;

    return { formatted, color, isPositive };
  }, [token.pricePercentChange1d]);

  // Animated style for the content
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isActive ? 1 : 0.3, { damping: 15, stiffness: 150 }),
    transform: [
      {
        scale: withSpring(isActive ? 1 : 0.95, { damping: 15, stiffness: 150 }),
      },
    ],
  }), [isActive]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
    >
      <Animated.View
        style={[tw.style('flex-1 px-6'), contentAnimatedStyle]}
      >
        {/* Top spacing for safe area */}
        <Box style={{ height: insets.top + 60 }} />

        {/* Token Logo - Large centered */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-8">
          <Animated.View
            entering={isActive ? FadeIn.delay(100).duration(300) : undefined}
          >
            <Box twClassName="w-24 h-24 rounded-full overflow-hidden bg-muted items-center justify-center">
              <AssetLogo asset={token} />
            </Box>
          </Animated.View>
        </Box>

        {/* Token Name & Symbol */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Animated.View
            entering={isActive ? FadeInDown.delay(150).duration(300) : undefined}
          >
            <Text
              variant={TextVariant.HeadingLG}
              fontWeight={FontWeight.Bold}
              color={TextColor.Default}
              twClassName="text-center"
            >
              {token.name || token.symbol}
            </Text>
          </Animated.View>

          <Animated.View
            entering={isActive ? FadeInDown.delay(200).duration(300) : undefined}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              twClassName="mt-1"
            >
              {token.symbol}
            </Text>
          </Animated.View>
        </Box>

        {/* Balance - Primary display */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-2">
          <Animated.View
            entering={isActive ? FadeInDown.delay(250).duration(300) : undefined}
          >
            <SensitiveText
              variant={TextVariant.DisplayMD}
              fontWeight={FontWeight.Bold}
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
            >
              {token.balanceFiat || '$0.00'}
            </SensitiveText>
          </Animated.View>
        </Box>

        {/* Token Balance in native units */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-6">
          <Animated.View
            entering={isActive ? FadeInDown.delay(300).duration(300) : undefined}
          >
            <SensitiveText
              variant={TextVariant.BodyLG}
              color={TextColor.Alternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
            >
              {token.balance} {token.symbol}
            </SensitiveText>
          </Animated.View>
        </Box>

        {/* Price Change */}
        {percentageChange && (
          <Box alignItems={BoxAlignItems.Center} twClassName="mb-8">
            <Animated.View
              entering={isActive ? FadeInDown.delay(350).duration(300) : undefined}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="px-4 py-2 rounded-full bg-muted"
              >
                <Icon
                  name={percentageChange.isPositive ? IconName.Arrow2Up : IconName.Arrow2Down}
                  size={IconSize.Sm}
                  color={percentageChange.isPositive ? IconColor.Success : IconColor.Error}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={percentageChange.color}
                  twClassName="ml-1"
                >
                  {percentageChange.formatted}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  twClassName="ml-2"
                >
                  {strings('trending.24h')}
                </Text>
              </Box>
            </Animated.View>
          </Box>
        )}

        {/* Staked badge if applicable */}
        {token.isStaked && (
          <Box alignItems={BoxAlignItems.Center} twClassName="mb-6">
            <Animated.View
              entering={isActive ? FadeInDown.delay(400).duration(300) : undefined}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="px-4 py-2 rounded-full bg-success-muted"
              >
                <Icon
                  name={IconName.Stake}
                  size={IconSize.Sm}
                  color={IconColor.Success}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Success}
                  twClassName="ml-2"
                >
                  {strings('transactions.staked')}
                </Text>
              </Box>
            </Animated.View>
          </Box>
        )}

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
              label={strings('wallet.token_story.view_details')}
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
                {strings('wallet.token_story.swipe_to_browse', {
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

export default React.memo(TokenStoryCard);
