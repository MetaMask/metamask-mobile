import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandardAnimated,
  IconName,
  SectionDivider,
  TitleStandard,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { RootState } from '../../../../reducers';
import { selectPrimaryHDKeyring } from '../../../../selectors/keyringController';
import { selectSessionProfileId } from '../../../../selectors/identity';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  moneyDashboardPersona,
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
} from '../../../../reducers/rewardsMoney/selectors';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';
import BenefitsPreview from '../components/Benefits/BenefitsPreview';
import RefererHeroCard from '../components/Money/RefererHeroCard';
import RefereeHeroCard from '../components/Money/RefereeHeroCard';
import RewardsOptInSection from '../components/Money/RewardsOptInSection';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsTabSkeleton from '../components/RewardsTabSkeleton/RewardsTabSkeleton';
import { useReferralMe } from '../hooks/useReferralMe';
import { navigateToRewardsRoute } from '../utils';

export const REWARDS_MONEY_DASHBOARD_TEST_IDS = {
  CONTAINER: 'rewards-money-dashboard',
  LOADING: 'rewards-money-dashboard-loading',
  ERROR: 'rewards-money-dashboard-error',
  SETTINGS_BUTTON: 'rewards-money-dashboard-settings-button',
  TABS: 'rewards-money-dashboard-tabs',
  WAYS_TO_EARN_TAB: 'rewards-money-dashboard-ways-to-earn-tab',
  EARNINGS_TAB: 'rewards-money-dashboard-earnings-tab',
  EARNINGS_TAB_DOT: 'rewards-money-dashboard-earnings-tab-indicator-dot',
  WAYS_TO_EARN_BODY: 'rewards-money-dashboard-ways-to-earn-body',
  EARNINGS_BODY: 'rewards-money-dashboard-earnings-body',
  CAMPAIGNS_SECTION: 'rewards-money-dashboard-campaigns-section',
  BENEFITS_SECTION: 'rewards-money-dashboard-benefits-section',
} as const;

type RewardsMoneyTab = 'waysToEarn' | 'earnings';

const TAB_ORDER: RewardsMoneyTab[] = ['waysToEarn', 'earnings'];

const hasClaimableEarnings = (claimable?: string): boolean => {
  if (!claimable) {
    return false;
  }
  try {
    return BigInt(claimable) > 0n;
  } catch {
    return false;
  }
};

function sessionHasNoProfile(
  identityReady: boolean,
  profileId: string | undefined,
): boolean {
  return identityReady && !profileId;
}

function referralReadSettledEmpty(
  profileId: string | undefined,
  hasReferral: boolean,
  entry: { loading: boolean } | undefined,
): boolean {
  // A session re-read settles loading and writes no error. A finished entry
  // with no payload is the error state; an entry that has not been written
  // yet is still the skeleton.
  return (
    Boolean(profileId) && entry !== undefined && !entry.loading && !hasReferral
  );
}

function dashboardStillLoading(
  identityReady: boolean,
  profileId: string | undefined,
  hasReferral: boolean,
  settledEmpty: boolean,
): boolean {
  if (!identityReady) {
    return true;
  }
  return Boolean(profileId) && !hasReferral && !settledEmpty;
}

function WaysToEarnBody({
  profileId,
  referralMe,
  subscriptionId,
}: {
  profileId: string;
  referralMe: ReferralMeDto;
  subscriptionId: string | null | undefined;
}) {
  const persona = moneyDashboardPersona(referralMe);
  return (
    <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY}>
      {persona === 'referrer' ? (
        <RefererHeroCard
          profileId={profileId}
          referralCode={referralMe.referral_code}
          localizedText={referralMe.localized_text}
        />
      ) : null}
      {persona === 'referee' ? (
        <RefereeHeroCard
          profileId={profileId}
          referredBy={referralMe.referred_by}
          localizedText={referralMe.localized_text}
        />
      ) : null}
      {subscriptionId ? (
        <>
          <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION}>
            <SectionDivider marginVertical={0} twClassName="mt-8 mb-5" />
            <CampaignsPreview />
          </Box>
          <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION}>
            <SectionDivider marginVertical={0} twClassName="mt-8 mb-5" />
            <BenefitsPreview />
          </Box>
        </>
      ) : (
        <RewardsOptInSection localizedText={referralMe.localized_text} />
      )}
    </Box>
  );
}

const RewardsMoneyDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const floatingTabBarInset = useFloatingTabBarInset();
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();
  const collapsingBlockStyle = useAnimatedStyle(() => {
    const maxShift = titleSectionHeightSv.value;
    const shift =
      maxShift > 0 ? Math.max(0, Math.min(scrollY.value, maxShift)) : 0;
    return {
      bottom: -maxShift,
      transform: [{ translateY: -shift }],
    };
  });
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const profileId = useSelector(selectSessionProfileId);
  const identityReady = Boolean(useSelector(selectPrimaryHDKeyring));
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const [activeTab, setActiveTab] = useState<RewardsMoneyTab>('waysToEarn');
  const showEarningsDot = hasClaimableEarnings(
    earningsSummaryEntry?.data?.claimable,
  );

  const referralMe = referralMeEntry?.data;
  const localizedText = referralMe?.localized_text;
  const isPushedScreen = navigation.getParent()?.getState()?.type !== 'tab';

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'waysToEarn',
        label: localizedText?.waysToEarn ?? '',
        content: null,
        testID: REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB,
      },
      {
        key: 'earnings',
        label: localizedText?.earningsTab ?? '',
        content: null,
        testID: REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB,
        endAccessory: showEarningsDot ? (
          // Absolute so the dot drops out of the tab layout and does not
          // widen the underline. top-1 cancels the tab's py-1 so it sits on
          // the label's top-right corner.
          <Box
            testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT}
            twClassName="absolute top-1 -right-1 h-1.5 w-1.5 flex-none rounded-full bg-success-default"
          />
        ) : undefined,
      },
    ],
    [localizedText, showEarningsDot],
  );

  const headerEndAccessory = (
    <Box twClassName="flex-row gap-2">
      {/* Rewards settings only exist for a subscription, so an unsubscribed
      user gets no control rather than a dead one. */}
      {subscriptionId ? (
        <ButtonIcon
          iconName={IconName.Setting}
          onPress={() =>
            navigateToRewardsRoute(navigation, Routes.REWARDS_SETTINGS_VIEW)
          }
          size={ButtonIconSize.Md}
          accessibilityLabel={strings('rewards.settings.title')}
          testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON}
        />
      ) : null}
    </Box>
  );

  const sessionSettledWithoutProfile = sessionHasNoProfile(
    identityReady,
    profileId,
  );
  const referralSettledWithoutData = referralReadSettledEmpty(
    profileId,
    Boolean(referralMe),
    referralMeEntry,
  );
  const stillLoading = dashboardStillLoading(
    identityReady,
    profileId,
    Boolean(referralMe),
    referralSettledWithoutData,
  );

  if (stillLoading) {
    // The same surface the tab shows while the persona resolves, so the two
    // waits read as one screen rather than a skeleton swapping for another.
    return (
      <RewardsTabSkeleton testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING} />
    );
  }

  if (sessionSettledWithoutProfile || referralSettledWithoutData) {
    return (
      <Box
        twClassName="flex-1 bg-default p-4"
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR}
      >
        <RewardsErrorBanner
          title={strings('rewards.referral_details_error.error_fetching_title')}
          description={strings(
            'rewards.referral_details_error.error_fetching_description',
          )}
          onConfirm={() => {
            void fetchReferralMe({ forceFresh: true });
          }}
          confirmButtonLabel={strings(
            'rewards.referral_details_error.retry_button',
          )}
        />
      </Box>
    );
  }

  if (!profileId || !referralMe) {
    return (
      <RewardsTabSkeleton testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING} />
    );
  }

  return (
    <ErrorBoundary navigation={navigation} view="RewardsMoneyDashboard">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER}
      >
        <HeaderStandardAnimated
          scrollY={scrollY}
          titleSectionHeight={titleSectionHeightSv}
          title={strings('rewards.main_title')}
          titleProps={{ accessibilityRole: 'header' }}
          onBack={isPushedScreen ? navigation.goBack : undefined}
          endAccessory={headerEndAccessory}
        />
        {/* `overflow-hidden` clips the title as the block slides up so it
            disappears under the fixed header (revealing the compact title)
            instead of scrolling over the header actions. */}
        <Box twClassName="flex-1 overflow-hidden">
          <Animated.View
            style={[
              tw.style('absolute top-0 right-0 bottom-0 left-0'),
              collapsingBlockStyle,
            ]}
          >
            <TitleStandard
              title={strings('rewards.main_title')}
              twClassName="px-4 pt-2 pb-4"
              onLayout={(event) =>
                setTitleSectionHeight(event.nativeEvent.layout.height)
              }
              titleProps={{ accessibilityRole: 'header' }}
            />
            <Box
              twClassName="border-b border-muted"
              testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.TABS}
            >
              <TabsBar
                tabs={tabs}
                activeIndex={TAB_ORDER.indexOf(activeTab)}
                onTabPress={(index) => setActiveTab(TAB_ORDER[index])}
              />
            </Box>
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style(`pb-[${floatingTabBarInset}px]`)}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              {/* Only the active tab is mounted. Earnings and Performance,
                  when those screens land, fetch on open rather than with
                  Ways to earn. Claim history reads its cached page on focus
                  and refreshes behind it. */}
              {activeTab === 'waysToEarn' ? (
                <WaysToEarnBody
                  profileId={profileId}
                  referralMe={referralMe}
                  subscriptionId={subscriptionId}
                />
              ) : (
                <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY} />
              )}
            </Animated.ScrollView>
          </Animated.View>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsMoneyDashboard;
