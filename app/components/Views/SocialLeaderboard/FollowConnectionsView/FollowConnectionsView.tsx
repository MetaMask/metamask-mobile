import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import Routes from '../../../../constants/navigation/Routes';
import type {
  AppStackNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { useFollowToggleMany } from '../../../hooks/useFollowToggle';
import { formatAddress } from '../../../../util/address';
import {
  useFollowedTraders,
  type FollowedTrader,
} from '../NotificationPreferences/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import ConnectionRow from './components/ConnectionRow';
import { FollowConnectionsViewSelectorsIDs } from './FollowConnectionsView.testIds';
import {
  useFollowers,
  useTraderFollowing,
  type FollowerConnection,
} from './hooks';

const addressesMatch = (
  left: string | undefined,
  right: string | undefined,
): boolean =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const isViewerConnection = (
  connection: { id: string; address: string },
  viewerProfileId: string | undefined,
  viewerAddress: string | undefined,
): boolean =>
  Boolean(
    (viewerProfileId && connection.id === viewerProfileId) ||
      addressesMatch(connection.address, viewerAddress),
  );

const tabIndexFor = (
  initialTab: 'followers' | 'following' | 'mutuals' | undefined,
  isTraderList: boolean,
): number => {
  if (initialTab === 'following') {
    return 1;
  }
  if (isTraderList && initialTab === 'mutuals') {
    return 2;
  }
  return 0;
};

const FollowConnectionsView: React.FC = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'FollowConnectionsView'>>();
  const tw = useTailwind();
  const addressOrId = route.params?.addressOrId;
  const isTraderList = Boolean(addressOrId);
  const initialTab = route.params?.initialTab ?? 'followers';
  const [activeIndex, setActiveIndex] = useState(
    tabIndexFor(initialTab, isTraderList),
  );

  // `navigate` can reuse this screen; keep the tab in sync with route params.
  useEffect(() => {
    setActiveIndex(tabIndexFor(initialTab, isTraderList));
  }, [addressOrId, initialTab, isTraderList]);
  const myFollowers = useFollowers({ enabled: !isTraderList });
  const traderFollowers = useFollowers({
    addressOrId,
    enabled: isTraderList,
  });
  const mutualFollowers = useFollowers({
    addressOrId,
    mutuals: true,
    enabled: isTraderList,
  });
  const myFollowing = useFollowedTraders({ enabled: !isTraderList });
  const traderFollowing = useTraderFollowing({
    addressOrId: addressOrId ?? '',
    enabled: isTraderList,
  });
  const followers = isTraderList
    ? traderFollowers.followers
    : myFollowers.followers;
  const followerCount = isTraderList
    ? traderFollowers.count
    : myFollowers.count;
  const isFollowersLoading = isTraderList
    ? traderFollowers.isLoading
    : myFollowers.isLoading;
  const followersError = isTraderList
    ? traderFollowers.error
    : myFollowers.error;
  const refreshFollowers = isTraderList
    ? traderFollowers.refresh
    : myFollowers.refresh;
  const following = isTraderList
    ? traderFollowing.traders
    : myFollowing.traders;
  const followingCount = isTraderList
    ? traderFollowing.count
    : myFollowing.traders.length;
  const isFollowingLoading = isTraderList
    ? traderFollowing.isLoading
    : myFollowing.isLoading;
  const followingError = isTraderList
    ? traderFollowing.error
    : myFollowing.error;
  const refreshFollowing = isTraderList
    ? traderFollowing.refresh
    : myFollowing.refresh;
  const { isFollowing, toggleFollow } = useFollowToggleMany();
  const { profileId: viewerProfileId } = useSessionProfileId();
  const viewerAddress = useSelector(selectSelectedInternalAccountAddress);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const connectionTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [
      {
        key: 'followers',
        label: strings('social_leaderboard.my_profile.followers_tab', {
          count: followerCount,
        }),
        content: null,
        testID: FollowConnectionsViewSelectorsIDs.FOLLOWERS_TAB,
      },
      {
        key: 'following',
        label: strings('social_leaderboard.my_profile.following_tab', {
          count: followingCount,
        }),
        content: null,
        testID: FollowConnectionsViewSelectorsIDs.FOLLOWING_TAB,
      },
    ];
    if (isTraderList) {
      tabs.push({
        key: 'mutuals',
        label: strings('social_leaderboard.my_profile.mutuals_tab', {
          count: mutualFollowers.count,
        }),
        content: null,
        testID: FollowConnectionsViewSelectorsIDs.MUTUALS_TAB,
      });
    }
    return tabs;
  }, [followerCount, followingCount, isTraderList, mutualFollowers.count]);

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleConnectionRowPress = useCallback(
    (connection: {
      id: string;
      username: string;
      address: string;
      avatarUri?: string;
    }) => {
      const isSelf = isViewerConnection(
        connection,
        viewerProfileId,
        viewerAddress,
      );

      if (isSelf) {
        navigateToSocialV1Profile(navigation, {
          traderId: connection.id,
          traderName: connection.username,
          traderAddress: connection.address,
          traderAvatarUri: connection.avatarUri,
          viewerProfileId,
          viewerAddress,
        });
        return;
      }

      navigation.push(Routes.SOCIAL.V1_PROFILE, {
        traderId: connection.id,
        traderName: connection.username,
        traderAddress: connection.address,
        traderAvatarUri: connection.avatarUri,
      });
    },
    [navigation, viewerAddress, viewerProfileId],
  );

  const handleFollowingRowPress = useCallback(
    (trader: FollowedTrader) => {
      handleConnectionRowPress(trader);
    },
    [handleConnectionRowPress],
  );

  const handleFollowerRowPress = useCallback(
    (follower: FollowerConnection) => {
      handleConnectionRowPress(follower);
    },
    [handleConnectionRowPress],
  );

  const handleFollowerFollowPress = useCallback(
    (follower: FollowerConnection) => {
      if (isViewerConnection(follower, viewerProfileId, viewerAddress)) {
        return;
      }
      toggleFollow(follower.id, {
        source: 'trader_profile',
        traderAddress: follower.address,
        traderUsername: follower.username,
        traderAvatarUri: follower.avatarUri,
      }).catch(() => undefined);
    },
    [toggleFollow, viewerAddress, viewerProfileId],
  );

  const handleFollowingFollowPress = useCallback(
    (trader: FollowedTrader) => {
      if (isViewerConnection(trader, viewerProfileId, viewerAddress)) {
        return;
      }
      toggleFollow(trader.id, {
        source: 'trader_profile',
        traderAddress: trader.address,
        traderUsername: trader.username,
        traderAvatarUri: trader.avatarUri,
      }).catch(() => undefined);
    },
    [toggleFollow, viewerAddress, viewerProfileId],
  );

  const renderFollowingItem = useCallback(
    ({ item }: { item: FollowedTrader }) => {
      const isSelf = isViewerConnection(item, viewerProfileId, viewerAddress);
      return (
        <ConnectionRow
          id={item.id}
          username={item.username}
          subtitle={formatAddress(item.address, 'short')}
          address={item.address}
          avatarUri={item.avatarUri}
          isFollowing={isTraderList ? isFollowing(item.id) : true}
          onFollowPress={
            isSelf ? undefined : () => handleFollowingFollowPress(item)
          }
          onRowPress={() => handleFollowingRowPress(item)}
        />
      );
    },
    [
      handleFollowingFollowPress,
      handleFollowingRowPress,
      isFollowing,
      isTraderList,
      viewerAddress,
      viewerProfileId,
    ],
  );

  const renderFollowerItem = useCallback(
    ({ item }: { item: FollowerConnection }) => {
      const isSelf = isViewerConnection(item, viewerProfileId, viewerAddress);
      return (
        <ConnectionRow
          id={item.id}
          username={item.username}
          subtitle={formatAddress(item.address, 'short')}
          address={item.address}
          avatarUri={item.avatarUri}
          isFollowing={isFollowing(item.id)}
          onFollowPress={
            isSelf ? undefined : () => handleFollowerFollowPress(item)
          }
          onRowPress={() => handleFollowerRowPress(item)}
        />
      );
    },
    [
      handleFollowerFollowPress,
      handleFollowerRowPress,
      isFollowing,
      viewerAddress,
      viewerProfileId,
    ],
  );

  const followingContent = (() => {
    if (isFollowingLoading && following.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWING_LOADING}
        >
          <Spinner />
        </Box>
      );
    }
    if (followingError && following.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWING_ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.my_profile.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={refreshFollowing}
            twClassName="self-center"
            testID={FollowConnectionsViewSelectorsIDs.FOLLOWING_RETRY}
          >
            {strings('social_leaderboard.my_profile.retry')}
          </Button>
        </Box>
      );
    }
    if (following.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          paddingHorizontal={4}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWING_EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings(
              isTraderList
                ? 'social_leaderboard.my_profile.empty_trader_following'
                : 'social_leaderboard.my_profile.empty_following',
            )}
          </Text>
        </Box>
      );
    }
    return (
      <FlatList
        data={following}
        keyExtractor={(item) => item.id}
        renderItem={renderFollowingItem}
        testID={FollowConnectionsViewSelectorsIDs.FOLLOWING_LIST}
      />
    );
  })();

  const followersContent = (() => {
    if (isFollowersLoading && followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_LOADING}
        >
          <Spinner />
        </Box>
      );
    }
    if (followersError && followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.my_profile.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={refreshFollowers}
            twClassName="self-center"
            testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_RETRY}
          >
            {strings('social_leaderboard.my_profile.retry')}
          </Button>
        </Box>
      );
    }
    if (followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          paddingHorizontal={4}
          testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.my_profile.empty_followers')}
          </Text>
        </Box>
      );
    }
    return (
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        renderItem={renderFollowerItem}
        testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_LIST}
      />
    );
  })();

  const mutualsContent = (() => {
    if (mutualFollowers.isLoading && mutualFollowers.followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={FollowConnectionsViewSelectorsIDs.MUTUALS_LOADING}
        >
          <Spinner />
        </Box>
      );
    }
    if (mutualFollowers.error && mutualFollowers.followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={FollowConnectionsViewSelectorsIDs.MUTUALS_ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.my_profile.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={mutualFollowers.refresh}
            twClassName="self-center"
            testID={FollowConnectionsViewSelectorsIDs.MUTUALS_RETRY}
          >
            {strings('social_leaderboard.my_profile.retry')}
          </Button>
        </Box>
      );
    }
    if (mutualFollowers.followers.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          paddingHorizontal={4}
          testID={FollowConnectionsViewSelectorsIDs.MUTUALS_EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.my_profile.empty_mutuals')}
          </Text>
        </Box>
      );
    }
    return (
      <FlatList
        data={mutualFollowers.followers}
        keyExtractor={(item) => item.id}
        renderItem={renderFollowerItem}
        testID={FollowConnectionsViewSelectorsIDs.MUTUALS_LIST}
      />
    );
  })();

  const activeContent =
    activeIndex === 1
      ? followingContent
      : activeIndex === 2
        ? mutualsContent
        : followersContent;

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={FollowConnectionsViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title=""
        onBack={handleBack}
        backButtonProps={{
          testID: FollowConnectionsViewSelectorsIDs.BACK_BUTTON,
        }}
        testID={FollowConnectionsViewSelectorsIDs.HEADER}
      />
      <Box twClassName="border-b border-muted">
        <TabsBar
          tabs={connectionTabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          testID={FollowConnectionsViewSelectorsIDs.TABS}
        />
      </Box>
      <Box twClassName="flex-1">{activeContent}</Box>
    </SafeAreaView>
  );
};

export default FollowConnectionsView;
