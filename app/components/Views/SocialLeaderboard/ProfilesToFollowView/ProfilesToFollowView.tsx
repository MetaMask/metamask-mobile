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
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import ConnectionRow from '../FollowConnectionsView/components/ConnectionRow';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { formatFollowerCountLabel } from '../utils/formatters';
import { usePopularTraders } from '../SocialV1View/feed/hooks/usePopularTraders';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import { ProfilesToFollowViewSelectorsIDs } from './ProfilesToFollowView.testIds';

/**
 * Full-screen list of the same leaderboard top 10 shown in the Trending
 * Popular traders carousel. Follow and profile navigation match the rail.
 */
const ProfilesToFollowView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { followWithSetup } = useFollowWithNotificationSetup();
  const {
    traders,
    isLoading,
    isFetching,
    hasFetched,
    error,
    refresh,
    toggleFollow,
  } = usePopularTraders();

  const isInFlight = isLoading || isFetching;
  const showLoading = isInFlight && traders.length === 0 && !hasFetched;
  const showError = Boolean(error) && traders.length === 0 && !isInFlight;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRowPress = useCallback(
    (trader: TopTrader) => {
      navigation.navigate(Routes.SOCIAL.PROFILE, {
        traderId: trader.id,
        traderName: trader.username,
        traderAddress: trader.address,
        source: 'profiles_to_follow',
        traderRank: trader.rank,
      });
    },
    [navigation],
  );

  const handleFollowPress = useCallback(
    async (trader: TopTrader) => {
      await followWithSetup(trader.isFollowing, () =>
        toggleFollow(trader.id, {
          source: 'profiles_to_follow',
          traderAddress: trader.address,
          traderUsername: trader.username,
          traderRank: trader.rank,
          traderAvatarUri: trader.avatarUri,
        }),
      );
    },
    [followWithSetup, toggleFollow],
  );

  const renderItem = useCallback(
    ({ item }: { item: TopTrader }) => (
      <ConnectionRow
        id={item.id}
        username={item.username}
        subtitle={formatFollowerCountLabel(item.followerCount)}
        address={item.address}
        avatarUri={item.avatarUri}
        isFollowing={item.isFollowing}
        onFollowPress={() => {
          handleFollowPress(item).catch(() => undefined);
        }}
        onRowPress={() => handleRowPress(item)}
      />
    ),
    [handleFollowPress, handleRowPress],
  );

  const listContent = (() => {
    if (showLoading) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={ProfilesToFollowViewSelectorsIDs.LOADING}
        >
          <Spinner />
        </Box>
      );
    }
    if (showError) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={ProfilesToFollowViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.profiles_to_follow.error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            onPress={() => {
              refresh().catch(() => undefined);
            }}
            testID={ProfilesToFollowViewSelectorsIDs.RETRY}
          >
            {strings('social_leaderboard.profiles_to_follow.retry')}
          </Button>
        </Box>
      );
    }
    if (traders.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          paddingHorizontal={4}
          testID={ProfilesToFollowViewSelectorsIDs.EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.profiles_to_follow.empty')}
          </Text>
        </Box>
      );
    }
    return (
      <FlatList
        data={traders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        testID={ProfilesToFollowViewSelectorsIDs.LIST}
      />
    );
  })();

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={ProfilesToFollowViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={strings('social_leaderboard.profiles_to_follow.title')}
        onBack={handleBack}
        backButtonProps={{
          testID: ProfilesToFollowViewSelectorsIDs.BACK_BUTTON,
        }}
        testID={ProfilesToFollowViewSelectorsIDs.HEADER}
      />
      <Box twClassName="flex-1">{listContent}</Box>
    </SafeAreaView>
  );
};

export default ProfilesToFollowView;
