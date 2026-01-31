import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { LeaderboardTrader } from '../../types';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';
import { formatPnL, formatFollowers } from '../../utils/formatters';

interface LeaderboardRowProps {
  /** The trader data to display */
  trader: LeaderboardTrader;
  /** The rank position (1-indexed) */
  rank: number;
  /** Callback when row is pressed */
  onPress?: (trader: LeaderboardTrader) => void;
}

/**
 * Renders a single row in the leaderboard table
 */
const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  trader,
  rank,
  onPress,
}) => {
  const tw = useTailwind();
  const pnl30d = trader.metadata.pnl30d ?? 0;
  const followerCount = trader.metrics?.allPartners?.followerCount ?? 0;
  const isPnlPositive = pnl30d >= 0;

  const handlePress = () => {
    onPress?.(trader);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) =>
        tw.style('py-3 border-b border-muted', pressed && 'bg-pressed')
      }
      testID={`${LeaderboardTestIds.TRADER_ROW}-${rank}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {/* Rank */}
        <Box twClassName="w-8">
          <Text variant={TextVariant.BodyMd} twClassName="text-muted">
            #{rank}
          </Text>
        </Box>

        {/* Trader Info - Avatar + Name */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 min-w-0 mr-2"
        >
          {/* Avatar */}
          <View
            style={tw.style(
              'w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0',
            )}
          >
            {trader.images.sm ? (
              <Image
                source={{ uri: trader.images.sm }}
                style={tw.style('w-full h-full')}
                testID={`${LeaderboardTestIds.TRADER_AVATAR}-${rank}`}
              />
            ) : (
              <View
                style={tw.style(
                  'w-full h-full bg-muted rounded-full items-center justify-center',
                )}
              >
                <Icon
                  name={IconName.User}
                  size={IconSize.Md}
                  color={IconColor.Muted}
                />
              </View>
            )}
          </View>

          {/* Name and Social Icons */}
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID={`${LeaderboardTestIds.TRADER_NAME}-${rank}`}
            >
              {trader.name}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              {trader.metadata.twitterHandle && (
                <Icon
                  name={IconName.X}
                  size={IconSize.Xs}
                  color={IconColor.Muted}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Followers */}
        <Box twClassName="w-16 mr-2" alignItems={BoxAlignItems.Center}>
          <Text
            variant={TextVariant.BodyMd}
            testID={`${LeaderboardTestIds.TRADER_FOLLOWERS}-${rank}`}
          >
            {formatFollowers(followerCount)}
          </Text>
        </Box>

        {/* PnL (30D) */}
        <Box twClassName="w-20" alignItems={BoxAlignItems.End}>
          <Text
            variant={TextVariant.BodyMd}
            twClassName={
              isPnlPositive ? 'text-success-default' : 'text-error-default'
            }
            testID={`${LeaderboardTestIds.TRADER_PNL}-${rank}`}
          >
            {formatPnL(pnl30d)}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default LeaderboardRow;
