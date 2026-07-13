import {
  Box,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { playSelection } from '../../../../util/haptics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';
import FeedView from '../FeedView';
import TopTradersView from '../TopTradersView';
import SocialTradersTabBar, {
  type SocialTradersTab,
} from './SocialTradersTabBar';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';

const LEADERBOARD_INDEX = 0;
const FEED_INDEX = 1;

/**
 * Container that adds the Leaderboard | Feed tabs on top of the Follow Trading
 * surface. Rendered in place of `TopTradersView` when the `aiSocialFeedEnabled`
 * flag is on. Keeps the existing header (title + notification bell) and shows
 * two swipeable pages: the existing leaderboard and the new activity feed.
 */
const SocialTradersTabsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(LEADERBOARD_INDEX);

  const {
    hasNotificationPreferences,
    isLoading: isLoadingNotificationPreferences,
  } = useNotificationStoragePreferences();

  const tabs: SocialTradersTab[] = useMemo(
    () => [
      {
        key: 'leaderboard',
        label: strings('social_leaderboard.feed.tabs.leaderboard'),
      },
      {
        key: 'feed',
        label: strings('social_leaderboard.feed.tabs.feed'),
      },
    ],
    [],
  );

  const changeTab = useCallback((index: number) => {
    setActiveIndex((current) => {
      if (current !== index) {
        playSelection().catch(() => undefined);
      }
      return index;
    });
  }, []);

  const handleTabPress = useCallback(
    (index: number) => {
      pagerRef.current?.setPage(index);
      changeTab(index);
    },
    [changeTab],
  );

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      changeTab(e.nativeEvent.position);
    },
    [changeTab],
  );

  useEffect(() => {
    pagerRef.current?.setPage(activeIndex);
  }, [activeIndex]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPreferencesPress = useCallback(() => {
    if (isLoadingNotificationPreferences) {
      return;
    }

    if (!hasNotificationPreferences) {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATIONS,
      });
      return;
    }

    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: {
        type: 'socialAI',
        title: strings('app_settings.notifications_opts.social_ai_title'),
        description: strings('app_settings.notifications_opts.social_ai_desc'),
      },
    });
  }, [
    hasNotificationPreferences,
    isLoadingNotificationPreferences,
    navigation,
  ]);

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-default')}
      testID={SocialTradersTabsViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: SocialTradersTabsViewSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Notification,
            onPress: handleNotificationPreferencesPress,
            testID: SocialTradersTabsViewSelectorsIDs.NOTIFICATION_BUTTON,
          },
        ]}
        testID={SocialTradersTabsViewSelectorsIDs.HEADER}
      />

      <Box twClassName="px-4 pt-2 pb-3">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          testID={SocialTradersTabsViewSelectorsIDs.TITLE}
        >
          {strings('social_leaderboard.feed.title')}
        </Text>
      </Box>

      <SocialTradersTabBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        twClassName="mb-4"
        testID={SocialTradersTabsViewSelectorsIDs.TABS}
      />

      <PagerView
        ref={pagerRef}
        style={tw.style('flex-1')}
        initialPage={LEADERBOARD_INDEX}
        onPageSelected={handlePageSelected}
        testID={SocialTradersTabsViewSelectorsIDs.PAGER}
      >
        <View
          key="leaderboard"
          style={tw.style('flex-1')}
          collapsable={false}
          testID={SocialTradersTabsViewSelectorsIDs.LEADERBOARD_PAGE}
        >
          <TopTradersView embeddedInTabs />
        </View>
        <View
          key="feed"
          style={tw.style('flex-1')}
          collapsable={false}
          testID={SocialTradersTabsViewSelectorsIDs.FEED_PAGE}
        >
          <FeedView isActive={activeIndex === FEED_INDEX} />
        </View>
      </PagerView>
    </SafeAreaView>
  );
};

export default SocialTradersTabsView;
