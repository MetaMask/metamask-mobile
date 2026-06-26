import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import LinearGradient from 'react-native-linear-gradient';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants/config';
import { usePushPermissionNotificationSetup } from '../../../../util/notifications/hooks/usePushPermissionNotificationSetup';

// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import { ALL_CHAINS, SPOT_CHAINS } from '../../shared/top-traders-constants';

import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import OnboardingLeaderboardCard from './components/OnboardingLeaderboardCard';
import createStyles from './SocialLeaderboardOnboarding.styles';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';
import {
  ONBOARDING_COLORS,
  ONBOARDING_GRADIENT_COLORS,
  ONBOARDING_TOP_TRADERS_LIMIT,
  isSocialLeaderboardOnboardingSkipSeen,
  type NotifySlideVariant,
  type OnboardingSlideId,
} from './constants';

const ONBOARDING_SOURCE = 'nux';
const SLIDE_IDS: OnboardingSlideId[] = ['trade', 'follow', 'notify'];
const TOTAL_SLIDES = SLIDE_IDS.length;

const markOnboardingSeen = () => {
  if (isSocialLeaderboardOnboardingSkipSeen) {
    return;
  }
  return StorageWrapper.setItem(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN, 'true', {
    emitEvent: false,
  });
};

/**
 * Social Leaderboard onboarding carousel (3 slides) shown once on app start.
 *
 * Slide 1: "Trade like a pro" -> Next.
 * Slide 2: "Follow the best" -> live top-3 trader cards; "Follow the top three" follows them, "Maybe later" skips.
 * Slide 3: "Never miss a move" -> optionally prompts to enable notifications, then exits to the Weekly Top Traders leaderboard.
 *
 * Animations are scaffolded with placeholder slots; the motion team supplies
 * the `.riv` file(s) later (swap the slot for a `<Rive />`, fill the artboard
 * names in `constants.ts`). The slide-2 cards are real, dynamic RN components.
 */
const SocialLeaderboardOnboarding: React.FC = () => {
  const navigation = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), []);
  const { track } = useSocialLeaderboardAnalytics();

  const [currentTab, setCurrentTab] = useState(0);
  const [notifyVariant, setNotifyVariant] =
    useState<NotifySlideVariant>('default');

  const scrollableTabViewRef = useRef<
    typeof ScrollableTabView & { goToPage: (pageNumber: number) => void }
  >(null);
  const hasCompletedRef = useRef(false);

  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const isNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const { enableNotificationsInBackground, requestPushPermission } =
    usePushPermissionNotificationSetup();

  const shouldPromptNotifications =
    isNotificationsFeatureEnabled() &&
    !(isNotificationsEnabled && isPushEnabled);

  const chains = useMemo(
    () => (isPerpsEnabled ? ALL_CHAINS : SPOT_CHAINS),
    [isPerpsEnabled],
  );

  const { traders, isLoading, toggleFollow } = useTopTraders({
    limit: ONBOARDING_TOP_TRADERS_LIMIT,
    chains,
  });

  const topTraders = useMemo(
    () => traders.slice(0, ONBOARDING_TOP_TRADERS_LIMIT),
    [traders],
  );

  const trackScreenViewed = useCallback(
    (slideIndex: number) => {
      track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED, {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
        [SocialLeaderboardEventProperties.SCREEN]: SLIDE_IDS[slideIndex],
      });
    },
    [track],
  );

  useEffect(() => {
    trackScreenViewed(0);
  }, [trackScreenViewed]);

  const handleTabChange = useCallback(
    (obj: { i: number }) => {
      setCurrentTab(obj.i);
      trackScreenViewed(obj.i);
    },
    [trackScreenViewed],
  );

  const goToLeaderboard = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }
    hasCompletedRef.current = true;
    void markOnboardingSeen();
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
    });
    navigation.dispatch(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: ONBOARDING_SOURCE,
      }),
    );
  }, [navigation, track]);

  const handleClose = useCallback(() => {
    void markOnboardingSeen();
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_DISMISSED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      [SocialLeaderboardEventProperties.SCREEN]: SLIDE_IDS[currentTab],
    });
    navigation.goBack();
  }, [navigation, track, currentTab]);

  const handleNext = useCallback(() => {
    scrollableTabViewRef.current?.goToPage(1);
  }, []);

  const handleFollowTopThree = useCallback(async () => {
    await Promise.all(
      topTraders
        .filter((trader) => !trader.isFollowing)
        .map((trader) =>
          toggleFollow(trader.id, {
            source: ONBOARDING_SOURCE,
            traderAddress: trader.address,
            traderUsername: trader.username,
            traderRank: trader.rank,
          }),
        ),
    );
    setNotifyVariant('followed');
    scrollableTabViewRef.current?.goToPage(2);
  }, [topTraders, toggleFollow]);

  const handleMaybeLater = useCallback(() => {
    setNotifyVariant('default');
    scrollableTabViewRef.current?.goToPage(2);
  }, []);

  const handleAllowNotifications = useCallback(async () => {
    const granted = await requestPushPermission();
    enableNotificationsInBackground(granted);
    track(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      },
    );
    goToLeaderboard();
  }, [
    requestPushPermission,
    enableNotificationsInBackground,
    track,
    goToLeaderboard,
  ]);

  const renderTabBar = () => <View />;

  const renderAnimationSlot = useCallback(
    () => (
      <View
        style={styles.animationSlot}
        testID={SocialLeaderboardOnboardingSelectorsIDs.ANIMATION_SLOT}
      />
    ),
    [styles.animationSlot],
  );

  const slides = useMemo(
    () => [
      {
        id: 'trade' as const,
        title: strings('social_leaderboard.onboarding.slide_trade.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_trade.description',
        ),
        content: renderAnimationSlot(),
      },
      {
        id: 'follow' as const,
        title: strings('social_leaderboard.onboarding.slide_follow.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_follow.description',
        ),
        content:
          isLoading || topTraders.length === 0 ? (
            renderAnimationSlot()
          ) : (
            <View style={styles.cardsContainer}>
              {topTraders.map((trader) => (
                <OnboardingLeaderboardCard key={trader.id} trader={trader} />
              ))}
            </View>
          ),
      },
      {
        id: 'notify' as const,
        title: strings('social_leaderboard.onboarding.slide_notify.title'),
        description:
          notifyVariant === 'followed'
            ? strings(
                'social_leaderboard.onboarding.slide_notify.description_followed',
              )
            : strings(
                'social_leaderboard.onboarding.slide_notify.description_default',
              ),
        content: renderAnimationSlot(),
      },
    ],
    [
      isLoading,
      topTraders,
      notifyVariant,
      renderAnimationSlot,
      styles.cardsContainer,
    ],
  );

  const renderSecondaryButton = (
    label: string,
    onPress: () => void,
    testID: string,
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={styles.secondaryButton}
      testID={testID}
    >
      <Text variant={TextVariant.BodyMDMedium} style={styles.onBrandText}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (currentTab === 0) {
      return (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleNext}
          testID={SocialLeaderboardOnboardingSelectorsIDs.NEXT_BUTTON}
        >
          {strings('social_leaderboard.onboarding.next')}
        </Button>
      );
    }

    if (currentTab === 1) {
      const isFollowDisabled = isLoading || topTraders.length === 0;
      return (
        <>
          {renderSecondaryButton(
            strings('social_leaderboard.onboarding.maybe_later'),
            handleMaybeLater,
            SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
          )}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isFollowDisabled}
            onPress={handleFollowTopThree}
            testID={
              SocialLeaderboardOnboardingSelectorsIDs.FOLLOW_TOP_THREE_BUTTON
            }
          >
            {strings('social_leaderboard.onboarding.follow_top_three')}
          </Button>
        </>
      );
    }

    return (
      <>
        {shouldPromptNotifications ? (
          renderSecondaryButton(
            strings('social_leaderboard.onboarding.got_it'),
            goToLeaderboard,
            SocialLeaderboardOnboardingSelectorsIDs.GOT_IT_BUTTON,
          )
        ) : (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={goToLeaderboard}
            testID={SocialLeaderboardOnboardingSelectorsIDs.GOT_IT_BUTTON}
          >
            {strings('social_leaderboard.onboarding.got_it')}
          </Button>
        )}
        {shouldPromptNotifications && (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleAllowNotifications}
            testID={
              SocialLeaderboardOnboardingSelectorsIDs.ALLOW_NOTIFICATIONS_BUTTON
            }
          >
            {strings('social_leaderboard.onboarding.allow_notifications')}
          </Button>
        )}
      </>
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
      testID={SocialLeaderboardOnboardingSelectorsIDs.CONTAINER}
    >
      <LinearGradient
        colors={[...ONBOARDING_GRADIENT_COLORS]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientBackground}
      />
      <View style={styles.topSection}>
        <View
          style={styles.progressContainer}
          testID={SocialLeaderboardOnboardingSelectorsIDs.PROGRESS_BAR}
        >
          {SLIDE_IDS.map((slideId, index) => (
            <View
              key={slideId}
              style={[
                styles.progressSegment,
                currentTab === index && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.closeRow}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            testID={SocialLeaderboardOnboardingSelectorsIDs.CLOSE_BUTTON}
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Md}
              color={ONBOARDING_COLORS.onBrandText}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.carouselWrapper}>
        <ScrollableTabView
          ref={scrollableTabViewRef}
          renderTabBar={renderTabBar}
          onChangeTab={handleTabChange}
          initialPage={0}
          locked
        >
          {slides.map((slide) => (
            <View key={slide.id} style={styles.fullScreenContainer}>
              <ScrollView
                style={styles.scrollableContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.screenContainer}>
                  <Text variant={TextVariant.HeadingLG} style={styles.title}>
                    {slide.title}
                  </Text>
                  <Text variant={TextVariant.BodyMD} style={styles.description}>
                    {slide.description}
                  </Text>
                  <View style={styles.contentSection}>{slide.content}</View>
                </View>
              </ScrollView>
            </View>
          ))}
        </ScrollableTabView>
      </View>

      <View style={[styles.footer, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.buttonRow}>{renderFooter()}</View>
      </View>
    </View>
  );
};

export default SocialLeaderboardOnboarding;
