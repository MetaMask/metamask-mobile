import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import LeaderboardService from '../../../UI/Leaderboard/services/LeaderboardService';
import { TraderProfile } from '../../../UI/Leaderboard/types';
import {
  formatPnL,
  truncateAddress,
} from '../../../UI/Leaderboard/utils/formatters';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    followingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      marginBottom: 8,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    traderInfo: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    unfollowButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.error.muted,
    },
  });

/**
 * Settings screen for managing Leaderboard preferences
 * - View and manage followed traders
 * - Future: notification settings, etc.
 */
const LeaderboardSettings: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const [followingProfiles, setFollowingProfiles] = useState<TraderProfile[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const userAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  // Setup navigation header
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('leaderboard.settings_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  // Fetch following profiles
  const fetchFollowing = useCallback(async () => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    try {
      const profiles =
        await LeaderboardService.getFollowingProfiles(userAddress);
      // Ensure we always set an array, even if API returns unexpected data
      setFollowingProfiles(Array.isArray(profiles) ? profiles : []);
    } catch (error) {
      console.warn('Failed to fetch following profiles:', error);
      setFollowingProfiles([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFollowing();
  }, [fetchFollowing]);

  const handleUnfollow = useCallback(
    async (profile: TraderProfile) => {
      if (!userAddress || !profile.addresses?.length) return;

      setUnfollowingId(profile.id);
      try {
        await LeaderboardService.unfollowAddress(userAddress, [
          profile.addresses[0],
        ]);
        // Remove from local state
        setFollowingProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      } catch (error) {
        console.warn('Failed to unfollow:', error);
      } finally {
        setUnfollowingId(null);
      }
    },
    [userAddress],
  );

  const renderFollowingItem = (profile: TraderProfile) => {
    const displayName =
      profile.name || truncateAddress(profile.addresses?.[0] || profile.id);
    const pnl = profile.metadata?.pnl30d ?? 0;
    const isPositive = pnl >= 0;
    const isUnfollowing = unfollowingId === profile.id;

    return (
      <View key={profile.id} style={styles.followingItem}>
        {/* Avatar */}
        <View style={styles.avatar}>
          {profile.images?.xs || profile.images?.sm ? (
            <Image
              source={{ uri: profile.images.xs || profile.images.sm || '' }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon
                name={IconName.User}
                size={IconSize.Md}
                color={IconColor.Muted}
              />
            </View>
          )}
        </View>

        {/* Trader Info */}
        <View style={styles.traderInfo}>
          <Text variant={TextVariant.BodyMd} numberOfLines={1}>
            {displayName}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            style={{
              color: isPositive ? colors.success.default : colors.error.default,
            }}
          >
            {formatPnL(pnl)} (30D)
          </Text>
        </View>

        {/* Unfollow Button */}
        <TouchableOpacity
          style={styles.unfollowButton}
          onPress={() => handleUnfollow(profile)}
          disabled={isUnfollowing}
        >
          {isUnfollowing ? (
            <ActivityIndicator size="small" color={colors.error.default} />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              style={{ color: colors.error.default, fontWeight: '600' }}
            >
              {strings('leaderboard.unfollow')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon
        name={IconName.UserCircleAdd}
        size={IconSize.Xl}
        color={IconColor.Muted}
      />
      <Text
        variant={TextVariant.BodyMd}
        style={{ color: colors.text.muted, marginTop: 16, textAlign: 'center' }}
      >
        {strings('leaderboard.no_following')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        style={{ color: colors.text.muted, marginTop: 8, textAlign: 'center' }}
      >
        {strings('leaderboard.no_following_desc')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Following Section */}
        <View style={styles.section}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            style={styles.sectionTitle}
          >
            <Text variant={TextVariant.HeadingSm}>
              {strings('leaderboard.following')}
            </Text>
            {followingProfiles && followingProfiles.length > 0 && (
              <Text
                variant={TextVariant.BodySm}
                style={{ color: colors.text.muted }}
              >
                {followingProfiles.length}
              </Text>
            )}
          </Box>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : !followingProfiles || followingProfiles.length === 0 ? (
            renderEmptyState()
          ) : (
            followingProfiles.map(renderFollowingItem)
          )}
        </View>

        {/* Future sections can be added here */}
        {/* e.g., Notification Settings, Preferences, etc. */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LeaderboardSettings;
