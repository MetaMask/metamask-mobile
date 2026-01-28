import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { LeaderboardTrader } from '../../types';
import { formatPnL, truncateAddress } from '../../utils/formatters';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
});

interface PodiumItemProps {
  trader: LeaderboardTrader;
  rank: 1 | 2 | 3;
  onPress: (trader: LeaderboardTrader) => void;
}

const PodiumItem: React.FC<PodiumItemProps> = ({ trader, rank, onPress }) => {
  const tw = useTailwind();

  // Configuration based on rank - Gold, Silver, Bronze
  const config = {
    1: {
      avatarSize: 64,
      pedestalHeight: 80,
      gradientColors: ['#FFD700', '#D4AF37', '#B8860B'], // Gold gradient
      pedestalTextColor: 'rgba(255, 255, 255, 0.9)',
      badgeColor: 'bg-warning-default',
      rankTextColor: 'text-default',
    },
    2: {
      avatarSize: 54,
      pedestalHeight: 60,
      gradientColors: ['#E8E8E8', '#C0C0C0', '#A8A8A8'], // Silver gradient
      pedestalTextColor: 'rgba(255, 255, 255, 0.8)',
      badgeColor: 'bg-muted',
      rankTextColor: 'text-default',
    },
    3: {
      avatarSize: 54,
      pedestalHeight: 48,
      gradientColors: ['#CD9B6D', '#CD7F32', '#A0522D'], // Bronze gradient
      pedestalTextColor: 'rgba(255, 255, 255, 0.9)',
      badgeColor: 'bg-warning-muted',
      rankTextColor: 'text-default',
    },
  }[rank];

  const displayName =
    trader.name || truncateAddress(trader.addresses[0] || trader.id);
  const pnl = trader.metadata.pnl30d ?? 0;
  const isPositive = pnl >= 0;

  return (
    <TouchableOpacity
      style={styles.podiumItem}
      onPress={() => onPress(trader)}
      activeOpacity={0.7}
    >
      {/* Avatar with rank badge */}
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatar,
            tw.style('border-2 border-default'),
            { width: config.avatarSize, height: config.avatarSize },
          ]}
        >
          {trader.images.xs || trader.images.sm ? (
            <Image
              source={{ uri: trader.images.xs || trader.images.sm || '' }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, tw.style('bg-alternative')]}>
              <Icon
                name={IconName.User}
                size={rank === 1 ? IconSize.Lg : IconSize.Md}
                color={IconColor.Muted}
              />
            </View>
          )}
        </View>

        {/* Rank badge */}
        <View style={[styles.rankBadge, tw.style(config.badgeColor)]}>
          <Text
            variant={TextVariant.BodyXs}
            twClassName={`${config.rankTextColor} font-bold`}
          >
            #{rank}
          </Text>
        </View>
      </View>

      {/* Name */}
      <Text
        variant={TextVariant.BodySm}
        twClassName="font-medium text-center"
        numberOfLines={1}
      >
        {displayName}
      </Text>

      {/* PnL */}
      <Text
        variant={TextVariant.BodySm}
        twClassName={`font-semibold ${isPositive ? 'text-success-default' : 'text-error-default'}`}
      >
        {formatPnL(pnl)}
      </Text>

      {/* Pedestal with gradient */}
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.pedestal,
          {
            height: config.pedestalHeight,
            marginTop: 12,
          },
        ]}
      >
        <Text
          variant={TextVariant.HeadingLg}
          style={{ color: config.pedestalTextColor }}
        >
          {rank}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

interface LeaderboardPodiumProps {
  /** Top 3 traders to display on the podium */
  traders: LeaderboardTrader[];
  /** Callback when a trader is pressed */
  onTraderPress: (trader: LeaderboardTrader) => void;
  /** Test ID for the component */
  testID?: string;
}

/**
 * Displays the top 3 traders in a podium format
 * Center position (1st) is elevated, with 2nd on the left and 3rd on the right
 */
const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  traders,
  onTraderPress,
  testID = 'leaderboard-podium',
}) => {
  // Need at least 3 traders for a podium
  if (traders.length < 3) {
    return null;
  }

  const [first, second, third] = traders;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.podiumRow}>
        {/* 2nd Place - Left */}
        <PodiumItem trader={second} rank={2} onPress={onTraderPress} />

        {/* 1st Place - Center (elevated) */}
        <PodiumItem trader={first} rank={1} onPress={onTraderPress} />

        {/* 3rd Place - Right */}
        <PodiumItem trader={third} rank={3} onPress={onTraderPress} />
      </View>
    </View>
  );
};

export default LeaderboardPodium;
