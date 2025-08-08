import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import rewardsAvatar from '../../../../images/rewards/rewards-avatar.png';
import RewardsPlatinum from '../../../../images/rewards/rewards-platinum.svg';
import RewardsBronze from '../../../../images/rewards/rewards-bronze.svg';
import RewardsSilver from '../../../../images/rewards/rewards-silver.svg';
import RewardsGold from '../../../../images/rewards/rewards-gold.svg';
import RewardsDiamond from '../../../../images/rewards/rewards-diamond.svg';
import { SeasonTierDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardsSeason } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsSeason';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { formatSeasonEndDate } from '../../../../util/rewards';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    section: {
      marginTop: 12,
      marginBottom: 24,
    },
    rankCard: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 16,
    },
    avatarContainer: {
      width: '33%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrapper: {
      width: 100,
      height: 100,
      borderRadius: 40,
      overflow: 'hidden',
    },
    avatar: {
      width: 100,
      height: 180,
    },
    textContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.primary.default,
    },
    totalLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      marginTop: 4,
    },
    rightSection: {
      flex: 1,
      paddingLeft: 16,
      justifyContent: 'center',
    },
    rankTitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.alternative,
      marginBottom: 4,
    },
    rankValue: {
      fontSize: 28,
      fontWeight: 'semibold',
      color: colors.text.default,
      marginBottom: 8,
    },
    joinDate: {
      fontSize: 12,
      color: colors.text.alternative,
      marginBottom: 12,
    },
    iconsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    rankIcon: {
      width: 20,
      height: 20,
    },
    seasonEndText: {
      fontSize: 16,
      color: colors.text.muted,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success.muted,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    liveBadgeText: {
      fontWeight: '600',
      color: colors.success.default,
      marginLeft: 4,
    },
    seasonTitle: {
      fontSize: 28,
      color: colors.text.default,
      marginBottom: 12,
      fontWeight: 500,
    },
    seasonDescription: {
      fontSize: 18,
      color: colors.text.default,
      lineHeight: 28,
      marginBottom: 16,
    },
    contentContainer: {
      paddingHorizontal: 16,
    },
    progressLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      marginBottom: 8,
    },
    fullWidthProgressBar: {
      height: 10,
      width: '100%',
      borderRadius: 5,
      backgroundColor: colors.background.pressed,
    },
    progressFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: colors.success.default,
    },
  });

interface SummaryTabProps {
  tabLabel: string;
}

const hasReachedTier = (userPoints: number, tier: SeasonTierDto): boolean =>
  !!userPoints && userPoints >= tier.pointsNeeded;

// Use platinum for STARTER tier
const rewardsImages = [
  RewardsPlatinum,
  RewardsBronze,
  RewardsSilver,
  RewardsGold,
  RewardsDiamond,
];

const SummaryTab: React.FC<SummaryTabProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { seasonData, seasonStatusData } = useRewardsSeason();
  const name = seasonData?.name || 'Upcoming Season';
  const endDate = seasonData?.endDate;

  // Determine current tier based on points
  const currentTierDto = useMemo(
    () =>
      (seasonData?.tiers || []).find(
        (t) => t.id === seasonStatusData?.currentTierId,
      ),
    [seasonData?.tiers, seasonStatusData?.currentTierId],
  );

  const orderedTiersDto = useMemo(
    () => seasonData?.tiers || [],
    [seasonData?.tiers],
  );

  const currentPoints = useMemo(
    () => seasonStatusData?.balance ?? 0,
    [seasonStatusData?.balance],
  );

  // Calculate points needed for next tier
  const nextTier = useMemo(() => {
    if (!orderedTiersDto || !currentTierDto) return undefined;

    // Find the next tier above current tier
    const currentTierIndex = orderedTiersDto.indexOf(currentTierDto);

    if (currentTierIndex >= orderedTiersDto.length - 1) {
      // Already at highest tier
      return {
        pointsToNextTier: 0,
        nextTierName: currentTierDto.type,
        nextTierPointsNeeded: currentPoints,
      };
    }

    const nextTierDto = orderedTiersDto[currentTierIndex + 1];

    if (!nextTierDto) return undefined;

    const pointsToNextTier = Math.max(
      nextTierDto.pointsNeeded - currentPoints,
      0,
    );

    return {
      pointsToNextTier,
      nextTierName: nextTierDto.type,
      nextTierPointsNeeded: nextTierDto.pointsNeeded,
    };
  }, [orderedTiersDto, currentPoints, currentTierDto]);

  return (
    <View style={styles.container}>
      {/* Rank Card */}
      <View style={styles.section}>
        <View style={styles.rankCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Image
                source={rewardsAvatar}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={styles.rankTitle}>Current Season Rank</Text>
            <Text style={styles.rankValue}>{currentTierDto?.type}</Text>
            <View style={styles.iconsContainer}>
              {orderedTiersDto.map((tier, index) => {
                const isReached = hasReachedTier(currentPoints, tier);
                const opacity = isReached ? 1 : 0.3;

                // Map tier types to components
                const TierComponent = rewardsImages[index];

                return (
                  <View key={tier.id} style={{ opacity }}>
                    <TierComponent
                      name={`rewards-${tier.type.toLowerCase()}`}
                      width={30}
                      height={30}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Season Info */}
        <View style={styles.section}>
          <View style={styles.contentContainer}>
            {seasonData && (
              <View style={styles.liveBadge}>
                <Icon
                  name={IconName.StarFilled}
                  size={IconSize.Xs}
                  color={colors.success.default}
                />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            )}
            <Text style={styles.seasonTitle}>{name}</Text>

            <Text style={styles.seasonDescription}>
              Join thousands of users earning rewards through staking, liquidity
              provision, and exclusive MetaMask programs.
            </Text>

            <Text style={styles.seasonEndText}>
              {formatSeasonEndDate(endDate)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.section}>
          <View style={styles.contentContainer}>
            <Text style={styles.progressLabel}>Progress to Next Tier</Text>

            <View style={styles.fullWidthProgressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      seasonData &&
                      (nextTier?.nextTierPointsNeeded || currentPoints) > 0
                        ? Math.min(
                            100,
                            (currentPoints /
                              (nextTier?.nextTierPointsNeeded ||
                                currentPoints)) *
                              100,
                          )
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SummaryTab;
