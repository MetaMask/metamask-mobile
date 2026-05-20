import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import PositionRow from './components/PositionRow';
import ProfileHeader from './components/ProfileHeader';
import {
  PositionRowSkeleton,
  ProfileHeaderSkeleton,
  StatsRowSkeleton,
} from './components/Skeletons';
import SortButton from './components/SortButton';
import StatsRow from './components/StatsRow';
import TopTradersNotificationsSetupBottomSheet, {
  type TopTradersNotificationsSetupBottomSheetRef,
} from './components/TopTradersNotificationsSetupBottomSheet';
import TraderNotificationsBottomSheet, {
  type TraderNotificationsBottomSheetRef,
} from './components/TraderNotificationsBottomSheet';
import { useTraderPositions, useTraderProfile } from './hooks';
import {
  CLOSED_SORT_CYCLE,
  OPEN_SORT_CYCLE,
  sortPositions,
  type ClosedSortKey,
  type OpenSortKey,
  type SortKey,
} from './utils/sortPositions';

const POSITION_SKELETON_COUNT = 4;
const POSITION_SKELETON_KEYS = Array.from(
  { length: POSITION_SKELETON_COUNT },
  (_, i) => `position-skeleton-${i}`,
);

const SORT_LABEL_KEYS: Record<SortKey, string> = {
  value: 'social_leaderboard.trader_profile.sort.value',
  pnl: 'social_leaderboard.trader_profile.sort.pnl_percent',
  recent: 'social_leaderboard.trader_profile.sort.recent',
};

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
  const { traderId, traderName, rank } = route.params;

  const {
    profile,
    isLoading,
    error: profileError,
    isFollowing,
    toggleFollow,
    refresh,
  } = useTraderProfile(traderId, { refetchInterval: 30_000 });
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    refetch: refetchPositions,
  } = useTraderPositions(traderId, { refetchInterval: 30_000 });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    preferences,
    hasNotificationPreferences,
    isLoading: isLoadingPreferences,
    setPushNotificationsEnabled,
    setTxAmountLimit,
  } = useNotificationPreferences();

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [openSort, setOpenSort] = useState<OpenSortKey>('value');
  const [closedSort, setClosedSort] = useState<ClosedSortKey>('recent');

  const notificationsSheetRef = useRef<TraderNotificationsBottomSheetRef>(null);
  const setupSheetRef =
    useRef<TopTradersNotificationsSetupBottomSheetRef>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    playImpact(ImpactMoment.PullToRefresh);
    try {
      // Both hooks rethrow after logging; allSettled keeps one failure from
      // taking down the other refetch and prevents an unhandled rejection
      // from surfacing in the UI.
      await Promise.allSettled([refresh(), refetchPositions()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, refetchPositions]);

  const handleNotificationPress = useCallback(() => {
    // Don't open any sheet while preferences are still loading — the enabled
    // default may not match the server, which would incorrectly route users
    // before their saved preferences are available.
    if (isLoadingPreferences) return;
    if (!hasNotificationPreferences) {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATIONS,
      });
      return;
    }
    if (preferences.pushNotificationsEnabled) {
      notificationsSheetRef.current?.onOpenBottomSheet();
    } else {
      setupSheetRef.current?.onOpenBottomSheet();
    }
  }, [
    hasNotificationPreferences,
    isLoadingPreferences,
    navigation,
    preferences.pushNotificationsEnabled,
  ]);

  const handlePositionPress = useCallback(
    (position: Position) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
        traderId,
        traderName,
        traderImageUrl: profile?.profile.imageUrl ?? undefined,
        tokenSymbol: position.tokenSymbol,
        position,
      });
    },
    [navigation, traderId, traderName, profile?.profile.imageUrl],
  );
  const positions = activeTab === 'open' ? openPositions : closedPositions;
  const isLoadingPositions =
    activeTab === 'open' ? isLoadingOpen : isLoadingClosed;

  const currentSortKey: SortKey = activeTab === 'open' ? openSort : closedSort;

  const sortedPositions = useMemo(
    () => sortPositions(positions, currentSortKey, activeTab),
    [positions, currentSortKey, activeTab],
  );

  const handleSortPress = useCallback(() => {
    // Fire-and-forget haptic; ignore rejection (unsupported platforms).
    playSelection().catch(() => undefined);
    if (activeTab === 'open') {
      setOpenSort((current) => {
        const idx = OPEN_SORT_CYCLE.indexOf(current);
        return OPEN_SORT_CYCLE[(idx + 1) % OPEN_SORT_CYCLE.length];
      });
    } else {
      setClosedSort((current) => {
        const idx = CLOSED_SORT_CYCLE.indexOf(current);
        return CLOSED_SORT_CYCLE[(idx + 1) % CLOSED_SORT_CYCLE.length];
      });
    }
  }, [activeTab]);

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            testID={TraderProfileViewSelectorsIDs.REFRESH_CONTROL}
          />
        }
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
                rank={rank}
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
                    onPress={toggleFollow}
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
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName="px-4 mb-2"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={4}
                  >
                    <TabButton
                      label={strings('social_leaderboard.trader_profile.open')}
                      isActive={activeTab === 'open'}
                      onPress={() => setActiveTab('open')}
                      testID={TraderProfileViewSelectorsIDs.TAB_OPEN}
                    />
                    <TabButton
                      label={strings(
                        'social_leaderboard.trader_profile.closed',
                      )}
                      isActive={activeTab === 'closed'}
                      onPress={() => setActiveTab('closed')}
                      testID={TraderProfileViewSelectorsIDs.TAB_CLOSED}
                    />
                  </Box>
                  {!isLoadingPositions && positions.length > 0 && (
                    <SortButton
                      label={strings(SORT_LABEL_KEYS[currentSortKey])}
                      onPress={handleSortPress}
                      testID={TraderProfileViewSelectorsIDs.SORT_BUTTON}
                    />
                  )}
                </Box>

                {isLoadingPositions ? (
                  POSITION_SKELETON_KEYS.map((key) => (
                    <PositionRowSkeleton key={key} />
                  ))
                ) : sortedPositions.length === 0 ? (
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
                  sortedPositions.map((position, index) => (
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
        setPushNotificationsEnabled={setPushNotificationsEnabled}
        setTxAmountLimit={setTxAmountLimit}
      />

      <TraderNotificationsBottomSheet
        ref={notificationsSheetRef}
        traderId={traderId}
        traderName={profile?.profile.name ?? traderName}
      />
    </SafeAreaView>
  );
};

export default TraderProfileView;
