import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { chainNameToId } from '../utils/chainMapping';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import { useTraderProfile, useTraderPositions } from './hooks';
import type { Position } from '@metamask/social-controllers';
import ProfileHeader from './components/ProfileHeader';
import StatsRow from './components/StatsRow';
import PositionRow from './components/PositionRow';
import {
  ProfileHeaderSkeleton,
  StatsRowSkeleton,
  PositionRowSkeleton,
} from './components/Skeletons';
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import { useNotificationPreferences } from '../NotificationPreferencesView/hooks';
import TraderNotificationsBottomSheet, {
  type TraderNotificationsBottomSheetRef,
} from './components/TraderNotificationsBottomSheet';
import TopTradersNotificationsSetupBottomSheet, {
  type TopTradersNotificationsSetupBottomSheetRef,
} from './components/TopTradersNotificationsSetupBottomSheet';

const POSITION_SKELETON_COUNT = 4;
const POSITION_SKELETON_KEYS = Array.from(
  { length: POSITION_SKELETON_COUNT },
  (_, i) => `position-skeleton-${i}`,
);

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  onPress,
  testID,
}) => (
  <TouchableOpacity onPress={onPress} testID={testID}>
    <Box twClassName={`pb-2 ${isActive ? 'border-b-2 border-default' : ''}`}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderProfileView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderProfileView'>>();
  const tw = useTailwind();
  const {
    traderId,
    traderName,
    traderAddress: traderAddressParam,
    source: sourceParam,
    traderRank,
  } = route.params;
  const source = sourceParam ?? 'deep_link';
  const { track } = useSocialLeaderboardAnalytics();

  const {
    profile,
    isLoading,
    error: profileError,
    isFollowing,
    toggleFollow,
    refresh,
  } = useTraderProfile(traderId, { refetchInterval: 30_000 });
  const { openPositions, closedPositions, isLoadingOpen, isLoadingClosed } =
    useTraderPositions(traderId, { refetchInterval: 30_000 });

  const traderAddress = traderAddressParam ?? profile?.profile.address ?? '';
  // Fire Trader Profile Screen Viewed once profile resolves so we have an
  // accurate trader_address / is_following at the point the user lands.
  const hasFiredScreenViewedRef = useRef(false);
  useEffect(() => {
    if (hasFiredScreenViewedRef.current) return;
    if (!profile) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
        traderAddress || profile.profile.address,
      [SocialLeaderboardEventProperties.TRADER_USERNAME]: profile.profile.name,
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.IS_FOLLOWING]: isFollowing,
      [SocialLeaderboardEventProperties.TRADER_RANK]: traderRank,
    });
  }, [profile, traderAddress, source, isFollowing, traderRank, track]);

  const {
    preferences,
    isLoading: isLoadingPreferences,
    setEnabled,
    setTxAmountLimit,
    toggleTraderNotification,
    isTraderNotificationEnabled,
  } = useNotificationPreferences();

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  const notificationsSheetRef = useRef<TraderNotificationsBottomSheetRef>(null);
  const setupSheetRef =
    useRef<TopTradersNotificationsSetupBottomSheetRef>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPress = useCallback(() => {
    // Don't open any sheet while preferences are still loading — the enabled
    // default is false, which would incorrectly route to the setup sheet for
    // users who already have notifications enabled.
    if (isLoadingPreferences) return;
    if (preferences.enabled) {
      notificationsSheetRef.current?.onOpenBottomSheet();
    } else {
      setupSheetRef.current?.onOpenBottomSheet();
    }
  }, [isLoadingPreferences, preferences.enabled]);

  const handleFollowPress = useCallback(() => {
    toggleFollow({
      source: 'trader_profile',
      traderAddress: traderAddress || profile?.profile.address || '',
      traderUsername: profile?.profile.name,
      // Rank only meaningful when arriving from a ranked surface; omit on
      // trader_profile to keep schema clean.
    });
  }, [toggleFollow, traderAddress, profile]);

  const handleTabChange = useCallback(
    (tab: 'open' | 'closed') => {
      setActiveTab((prev) => {
        if (prev === tab) return prev;
        if (traderAddress) {
          track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_TAB_CHANGED, {
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
            [SocialLeaderboardEventProperties.TAB]: tab,
          });
        }
        return tab;
      });
    },
    [traderAddress, track],
  );

  const handlePositionPress = useCallback(
    (position: Position) => {
      const caipChainId = chainNameToId(position.chain);
      const caip19 = caipChainId
        ? (toAssetId(position.tokenAddress, caipChainId) ?? '')
        : '';
      if (traderAddress && caip19) {
        track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_POSITION_CLICKED, {
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
          [SocialLeaderboardEventProperties.CAIP19]: caip19,
          [SocialLeaderboardEventProperties.ASSET_NAME]: position.tokenSymbol,
          [SocialLeaderboardEventProperties.IS_OPEN]: activeTab === 'open',
        });
      }
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
        traderId,
        traderName,
        traderImageUrl: profile?.profile.imageUrl ?? undefined,
        traderAddress: traderAddress || undefined,
        tokenSymbol: position.tokenSymbol,
        position,
        source: 'profile_position',
      });
    },
    [
      navigation,
      traderId,
      traderName,
      profile?.profile.imageUrl,
      traderAddress,
      activeTab,
      track,
    ],
  );
  const positions = activeTab === 'open' ? openPositions : closedPositions;
  const isLoadingPositions =
    activeTab === 'open' ? isLoadingOpen : isLoadingClosed;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderProfileViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <Box twClassName="w-20">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            testID={TraderProfileViewSelectorsIDs.BACK_BUTTON}
          />
        </Box>
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {profile?.profile.name ?? traderName}
        </Text>
        <Box twClassName="w-20 items-end">
          <ButtonIcon
            iconName={IconName.Notification}
            size={ButtonIconSize.Md}
            onPress={handleNotificationPress}
            testID={TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON}
          />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {!isLoading && profileError && !profile ? (
          <Box testID={TraderProfileViewSelectorsIDs.ERROR_BANNER}>
            <ErrorState
              title={strings(
                'social_leaderboard.trader_profile.error_loading_profile',
              )}
              onRetry={refresh}
            />
          </Box>
        ) : (
          <>
            {isLoading || !profile ? (
              <ProfileHeaderSkeleton />
            ) : (
              <ProfileHeader
                profile={profile.profile}
                followerCount={profile.followerCount}
                twitterHandle={profile.socialHandles?.twitter}
              />
            )}

            {isLoading || !profile ? (
              <StatsRowSkeleton />
            ) : (
              <StatsRow
                stats={profile.stats}
                holdTimeMinutes={profile.stats.medianHoldMinutes}
              />
            )}

            {!isLoading && profile && (
              <>
                <Box twClassName="px-4 pt-3 pb-1">
                  <Button
                    variant={
                      isFollowing
                        ? ButtonVariant.Secondary
                        : ButtonVariant.Primary
                    }
                    isFullWidth
                    onPress={handleFollowPress}
                    testID={TraderProfileViewSelectorsIDs.FOLLOW_BUTTON}
                  >
                    {isFollowing
                      ? strings('social_leaderboard.following')
                      : strings('social_leaderboard.follow')}
                  </Button>
                </Box>

                <Box twClassName="h-px bg-muted mx-4 mt-5 mb-4" />

                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="px-4 mb-2"
                  gap={4}
                >
                  <TabButton
                    label={strings('social_leaderboard.trader_profile.open')}
                    isActive={activeTab === 'open'}
                    onPress={() => handleTabChange('open')}
                    testID={TraderProfileViewSelectorsIDs.TAB_OPEN}
                  />
                  <TabButton
                    label={strings('social_leaderboard.trader_profile.closed')}
                    isActive={activeTab === 'closed'}
                    onPress={() => handleTabChange('closed')}
                    testID={TraderProfileViewSelectorsIDs.TAB_CLOSED}
                  />
                </Box>

                {isLoadingPositions ? (
                  POSITION_SKELETON_KEYS.map((key) => (
                    <PositionRowSkeleton key={key} />
                  ))
                ) : positions.length === 0 ? (
                  <Box
                    twClassName="px-4 py-8"
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'social_leaderboard.trader_profile.no_positions',
                      )}
                    </Text>
                  </Box>
                ) : (
                  positions.map((position, index) => (
                    <PositionRow
                      key={`${position.tokenAddress}-${position.chain}-${index}`}
                      position={position}
                      onPress={handlePositionPress}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TopTradersNotificationsSetupBottomSheet
        ref={setupSheetRef}
        preferences={preferences}
        setEnabled={setEnabled}
        setTxAmountLimit={setTxAmountLimit}
      />

      <TraderNotificationsBottomSheet
        ref={notificationsSheetRef}
        traderId={traderId}
        traderName={profile?.profile.name ?? traderName}
        preferences={preferences}
        isTraderNotificationEnabled={isTraderNotificationEnabled}
        toggleTraderNotification={toggleTraderNotification}
      />
    </SafeAreaView>
  );
};

export default TraderProfileView;
