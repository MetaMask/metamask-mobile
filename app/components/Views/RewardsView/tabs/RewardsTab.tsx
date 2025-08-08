import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  FlatList,
  Text,
} from 'react-native';
import { useTheme } from '../../../../util/theme';
import { useClaimRewardMutation } from '../../../../core/Engine/controllers/rewards-controller/services/rewardsApi';
import type { Colors } from '../../../../util/theme/models';
import { useRewardsCatalog } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsCatalog';
import {
  RewardClaimStatus,
  type SeasonRewardCatalogDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardsSeason } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsSeason';
import RewardsPointsIcon from '../../../../images/rewards/rewards-points.svg';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useClaimReward } from '../../../../core/Engine/controllers/rewards-controller/hooks/useClaimReward';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollContainer: {},
    section: {
      marginTop: 12,
      marginBottom: 24,
    },
    emptyState: {
      backgroundColor: colors.background.muted,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    tierTitleCard: {
      borderRadius: 12,
      padding: 16,
    },
    tierTitle: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.text.default,
      marginBottom: 4,
      textTransform: 'capitalize',
      lineHeight: 48,
    },
    tierSubtitle1: {
      fontSize: 14,
      color: colors.text.alternative,
      fontWeight: '500',
    },
    tierSubtitle2: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
    },
    pointsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pointsIcon: {
      marginRight: 8,
    },
    gridContainer: {
      paddingHorizontal: 0,
    },
    rewardImageCard: {
      borderRadius: 12,
      padding: 12,
      margin: 6,
      alignItems: 'center',
      flex: 1,
      maxWidth: '47%',
      minHeight: 180,
      borderWidth: 2,
      borderColor: colors.border.muted,
    },
    rewardImage: {
      width: 120,
      height: 120,
      borderRadius: 8,
      marginBottom: 12,
    },
    rewardCardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
      marginTop: 12,
    },
    rewardCardDescription: {
      fontSize: 14,
      color: colors.text.alternative,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 20,
    },
    actionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    lockedText: {
      color: colors.text.muted,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    imageContainer: {
      position: 'relative',
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay.default,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    claimButton: {
      width: '100%',
      backgroundColor: colors.primary.default,
    },
    redeemedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    redeemedText: {
      fontSize: 16,
      marginLeft: 8,
      color: colors.success.default,
    },
    countdownContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    countdownText: {
      fontSize: 16,
      marginLeft: 8,
      color: colors.success.default,
    },
  });

interface RewardsTabProps {
  tabLabel: string;
}

const RewardsTab: React.FC<RewardsTabProps> = () => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const { rewardsCatalog, rewards } = useRewardsCatalog();
  const { seasonData, seasonStatusData } = useRewardsSeason();
  const { claimReward } = useClaimReward();

  const currentPoints = useMemo(
    () => seasonStatusData?.balance ?? 0,
    [seasonStatusData?.balance],
  );

  // Group rewards catalog by tier type
  const groupedRewards = useMemo(() => {
    if (!rewardsCatalog?.seasonRewards) return {};
    return rewardsCatalog.seasonRewards.reduce(
      (acc: Record<string, SeasonRewardCatalogDto[]>, reward) => {
        const tierType = reward.seasonTierType;
        if (!acc[tierType]) {
          acc[tierType] = [];
        }
        acc[tierType].push(reward);
        return acc;
      },
      {},
    );
  }, [rewardsCatalog]);

  // Get available tiers from season data
  const availableTiers = useMemo(() => seasonData?.tiers || [], [seasonData]);

  // Check if a reward is claimable by matching seasonRewardId
  const isRewardUnlocked = useCallback(
    (catalogItem: SeasonRewardCatalogDto) => {
      if (!rewards || rewards.length === 0) return false;
      return rewards.some((reward) => reward.seasonRewardId === catalogItem.id);
    },
    [rewards],
  );

  const isRewardUnclaimed = useCallback(
    (catalogItem: SeasonRewardCatalogDto) => {
      if (!rewards || rewards.length === 0) return true;
      return rewards.some(
        (reward) =>
          reward.seasonRewardId === catalogItem.id &&
          reward.claimStatus === RewardClaimStatus.UNCLAIMED,
      );
    },
    [rewards],
  );

  const isRewardClaimed = useCallback(
    (catalogItem: SeasonRewardCatalogDto) => {
      if (!rewards || rewards.length === 0) return { isClaimed: false };
      const claimedReward = rewards.find(
        (reward) =>
          reward.seasonRewardId === catalogItem.id &&
          reward.claimStatus === RewardClaimStatus.CLAIMED,
      );

      return {
        isClaimed: Boolean(claimedReward),
        activeFrom: claimedReward?.claim?.data?.activeFrom,
        activeUntil: claimedReward?.claim?.data?.activeUntil,
      };
    },
    [rewards],
  );

  // Render individual reward card
  const renderRewardCard = ({ item }: { item: SeasonRewardCatalogDto }) => {
    const isClaimable = isRewardUnlocked(item);
    const isUnclaimed = isRewardUnclaimed(item);
    const { isClaimed, activeUntil } = isRewardClaimed(item);
    const isActive = activeUntil ? dayjs(activeUntil).isAfter(dayjs()) : false;

    return (
      <View style={styles.rewardImageCard}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUri }}
            style={styles.rewardImage}
            resizeMode="cover"
          />
          {!isClaimable && (
            <View style={styles.imageOverlay}>
              <Icon
                name={IconName.Lock}
                size={IconSize.Md}
                color={colors.icon.inverse}
              />
            </View>
          )}
        </View>

        <Text
          style={[
            styles.rewardCardTitle,
            !isClaimable && { color: colors.text.alternative },
          ]}
        >
          {item.name}
        </Text>
        <Text style={styles.rewardCardDescription}>{item.description}</Text>

        {!isClaimable ? (
          <View style={styles.actionContent}>
            <Icon
              name={IconName.Lock}
              size={IconSize.Sm}
              color={colors.icon.muted}
            />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        ) : isUnclaimed ? (
          <View style={styles.actionContent}>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Sm}
              label="Redeem"
              startIconName={IconName.Gift}
              style={styles.claimButton}
              onPress={() => claimReward(item)}
            />
          </View>
        ) : isActive ? (
          <View style={styles.countdownContainer}>
            <Icon
              name={IconName.Clock}
              color={IconColor.Success}
              size={IconSize.Md}
            />
            <Text style={styles.countdownText}>
              {dayjs(activeUntil).fromNow(true)} left
            </Text>
          </View>
        ) : isClaimed ? (
          <View style={styles.redeemedContainer}>
            <Icon
              name={IconName.Confirmation}
              color={IconColor.Success}
              size={IconSize.Md}
            />
            <Text style={styles.redeemedText}>Redeemed</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Rewards Catalog by Tier */}
        {availableTiers.map((tier, tierIndex) => {
          const tierRewards = groupedRewards[tier.type] || [];

          if (tierRewards.length === 0) return null;

          return (
            <View key={tier.id} style={styles.section}>
              <View style={styles.tierTitleCard}>
                <Text style={styles.tierSubtitle1}>Level {tierIndex + 1}</Text>
                <Text style={styles.tierTitle}>{tier.type}</Text>
                <View style={styles.pointsContainer}>
                  <RewardsPointsIcon
                    style={styles.pointsIcon}
                    width={18}
                    height={18}
                    name="rewards-points-icon"
                  />
                  <Text style={styles.tierSubtitle2}>
                    {currentPoints}/{tier.pointsNeeded}
                  </Text>
                </View>
              </View>
              <FlatList
                data={tierRewards}
                renderItem={renderRewardCard}
                keyExtractor={(item, index) => `${item.seasonTierId}-${index}`}
                numColumns={2}
                columnWrapperStyle={styles.gridContainer}
                scrollEnabled={false}
              />
            </View>
          );
        })}

        {/* Empty state if no rewards */}
        {Object.keys(groupedRewards).length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No rewards catalog available at the moment
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default RewardsTab;
