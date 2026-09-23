import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
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
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { useFollowToggleMany } from '../../../hooks/useFollowToggle';
import { formatAddress } from '../../../../util/address';
import {
  useFollowedTraders,
  type FollowedTrader,
} from '../NotificationPreferences/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import ConnectionRow from './components/ConnectionRow';
import { FollowConnectionsViewSelectorsIDs } from './FollowConnectionsView.testIds';
import { useFollowers, type FollowerConnection } from './hooks';

const FollowConnectionsView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'FollowConnectionsView'>>();
  const tw = useTailwind();
  const initialTab = route.params?.initialTab ?? 'followers';
  const [activeIndex, setActiveIndex] = useState(
    initialTab === 'following' ? 1 : 0,
  );
  const { followers } = useFollowers();
  const {
    traders: following,
    isLoading: isFollowingLoading,
    error: followingError,
    refresh: refreshFollowing,
  } = useFollowedTraders();
  const { toggleFollow } = useFollowToggleMany();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const connectionTabs: TabItem[] = useMemo(
    () => [
      {
        key: 'followers',
        label: strings('social_leaderboard.my_profile.followers_tab', {
          count: followers.length,
        }),
        content: null,
        testID: FollowConnectionsViewSelectorsIDs.FOLLOWERS_TAB,
      },
      {
        key: 'following',
        label: strings('social_leaderboard.my_profile.following_tab', {
          count: following.length,
        }),
        content: null,
        testID: FollowConnectionsViewSelectorsIDs.FOLLOWING_TAB,
      },
    ],
    [followers.length, following.length],
  );

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleFollowingRowPress = useCallback(
    (trader: FollowedTrader) => {
      navigation.navigate(Routes.SOCIAL.PROFILE, {
        traderId: trader.id,
        traderName: trader.username,
        traderAddress: trader.address,
      });
    },
    [navigation],
  );

  const handleUnfollow = useCallback(
    (trader: FollowedTrader) => {
      toggleFollow(trader.id, {
        source: 'trader_profile',
        traderAddress: trader.address,
        traderUsername: trader.username,
        traderAvatarUri: trader.avatarUri,
      }).catch(() => undefined);
    },
    [toggleFollow],
  );

  const renderFollowingItem = useCallback(
    ({ item }: { item: FollowedTrader }) => (
      <ConnectionRow
        id={item.id}
        username={item.username}
        subtitle={formatAddress(item.address, 'short')}
        address={item.address}
        avatarUri={item.avatarUri}
        isFollowing
        onFollowPress={() => handleUnfollow(item)}
        onRowPress={() => handleFollowingRowPress(item)}
      />
    ),
    [handleFollowingRowPress, handleUnfollow],
  );

  const renderFollowerItem = useCallback(
    ({ item }: { item: FollowerConnection }) => (
      <ConnectionRow
        id={item.id}
        username={item.username}
        subtitle={`@${item.handle}`}
        address={item.address}
        avatarUri={item.avatarUri}
        isFollowing={false}
        onFollowPress={() => undefined}
      />
    ),
    [],
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
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {followingError}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            onPress={refreshFollowing}
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
            {strings('social_leaderboard.my_profile.empty_following')}
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

  const followersContent =
    followers.length === 0 ? (
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
    ) : (
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        renderItem={renderFollowerItem}
        testID={FollowConnectionsViewSelectorsIDs.FOLLOWERS_LIST}
      />
    );

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
      <Box twClassName="flex-1">
        {activeIndex === 0 ? followersContent : followingContent}
      </Box>
    </SafeAreaView>
  );
};

export default FollowConnectionsView;
