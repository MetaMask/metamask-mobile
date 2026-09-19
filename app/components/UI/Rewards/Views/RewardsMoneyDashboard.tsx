import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  Icon,
  IconName,
  IconSize,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { RootState } from '../../../../reducers';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
} from '../../../../reducers/rewardsMoney/selectors';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';
import BenefitsPreview from '../components/Benefits/BenefitsPreview';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RefererHeroCard from '../components/Money/RefererHeroCard';
import RefereeHeroCard from '../components/Money/RefereeHeroCard';
import RewardsOptInSection from '../components/Money/RewardsOptInSection';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import { navigateToRewardsRoute } from '../utils';

export const REWARDS_MONEY_DASHBOARD_TEST_IDS = {
  CONTAINER: 'rewards-money-dashboard',
  LOADING: 'rewards-money-dashboard-loading',
  CHART_BUTTON: 'rewards-money-dashboard-chart-button',
  SETTINGS_BUTTON: 'rewards-money-dashboard-settings-button',
  TABS: 'rewards-money-dashboard-tabs',
  WAYS_TO_EARN_TAB: 'rewards-money-dashboard-ways-to-earn-tab',
  EARNINGS_TAB: 'rewards-money-dashboard-earnings-tab',
  WAYS_TO_EARN_BODY: 'rewards-money-dashboard-ways-to-earn-body',
  EARNINGS_BODY: 'rewards-money-dashboard-earnings-body',
  ERROR_BANNER: 'rewards-money-dashboard-error-banner',
} as const;

type RewardsMoneyTab = 'waysToEarn' | 'earnings';

const TAB_ORDER: RewardsMoneyTab[] = ['waysToEarn', 'earnings'];

const RewardsMoneyDashboard: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const floatingTabBarInset = useFloatingTabBarInset();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const { profileId, isResolved: isProfileResolved } = useSessionProfileId();
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const [activeTab, setActiveTab] = useState<RewardsMoneyTab>('waysToEarn');

  useEarningsSummary(profileId);

  const referralMe = referralMeEntry?.data;
  const localizedText = referralMe?.localized_text;
  const earningsSummary = earningsSummaryEntry?.data ?? null;
  // A summary that failed is not an error on this screen: the hero still reads
  // without its totals, so the cards drop the amount rather than the tab
  // showing a banner about money the user did not ask for yet.
  const isEarningsLoading =
    !earningsSummary && Boolean(earningsSummaryEntry?.loading);
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
      },
    ],
    [localizedText],
  );

  const headerEndAccessory = (
    <Box twClassName="flex-row gap-2">
      <Icon
        name={IconName.Chart}
        size={IconSize.Md}
        accessible
        accessibilityLabel={localizedText?.performanceTitle}
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CHART_BUTTON}
      />
      <ButtonIcon
        disabled={!subscriptionId}
        iconName={IconName.Setting}
        onPress={() =>
          navigateToRewardsRoute(navigation, Routes.REWARDS_SETTINGS_VIEW)
        }
        size={ButtonIconSize.Md}
        accessibilityLabel={strings('rewards.settings.title')}
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON}
      />
    </Box>
  );

  if (
    !isProfileResolved ||
    (!referralMe && Boolean(referralMeEntry?.loading))
  ) {
    return (
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER}
      >
        {/* Mirrors the loaded layout — header, tabs, hero, two preview cards —
            so the skeleton does not reflow when referral me lands. */}
        <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING}>
          <Box twClassName="flex-row items-center justify-between px-4 py-3">
            <Skeleton style={tw.style('h-7 w-32 rounded-md')} />
            <Box twClassName="flex-row gap-2">
              <Skeleton style={tw.style('h-6 w-6 rounded-full')} />
              <Skeleton style={tw.style('h-6 w-6 rounded-full')} />
            </Box>
          </Box>

          <Box twClassName="flex-row gap-6 border-b border-muted px-4 pb-3">
            <Skeleton style={tw.style('h-5 w-24 rounded-md')} />
            <Skeleton style={tw.style('h-5 w-20 rounded-md')} />
          </Box>

          <Box twClassName="gap-4 p-4">
            <Skeleton style={tw.style('h-44 w-full rounded-xl')} />
            <Skeleton style={tw.style('h-28 w-full rounded-xl')} />
            <Skeleton style={tw.style('h-28 w-full rounded-xl')} />
          </Box>
        </Box>
      </SafeAreaView>
    );
  }

  if (!profileId || !referralMeEntry || !referralMe) {
    return (
      <ErrorBoundary navigation={navigation} view="RewardsMoneyDashboard">
        <SafeAreaView
          edges={{ top: 'additive' }}
          style={tw.style('flex-1 bg-default')}
          testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER}
        >
          <HeaderStandard title={strings('rewards.main_title')} />
          <Box twClassName="p-4">
            <RewardsErrorBanner
              title={strings(
                'rewards.referral_details_error.error_fetching_title',
              )}
              description={strings(
                'rewards.referral_details_error.error_fetching_description',
              )}
              testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR_BANNER}
            />
          </Box>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary navigation={navigation} view="RewardsMoneyDashboard">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={strings('rewards.main_title')}
          titleProps={{ accessibilityRole: 'header' }}
          onBack={isPushedScreen ? navigation.goBack : undefined}
          endAccessory={headerEndAccessory}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style(`pb-[${floatingTabBarInset}px]`)}
        >
          <Box>
            <Box
              twClassName="border-b border-muted"
              testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.TABS}
            >
              <TabsBar
                tabs={tabs}
                isFullWidth
                activeIndex={TAB_ORDER.indexOf(activeTab)}
                onTabPress={(index) => setActiveTab(TAB_ORDER[index])}
              />
            </Box>
            {activeTab === 'waysToEarn' ? (
              <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY}>
                {referralMeEntry.error ? (
                  <Box twClassName="px-4 pt-4">
                    <RewardsErrorBanner
                      title={strings(
                        'rewards.referral_details_error.error_fetching_title',
                      )}
                      description={strings(
                        'rewards.referral_details_error.error_fetching_description',
                      )}
                      testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR_BANNER}
                    />
                  </Box>
                ) : null}
                {referralMe?.variant === 'REFERRER' ? (
                  <RefererHeroCard
                    referralCode={referralMe.referral_code}
                    localizedText={referralMe.localized_text}
                    earningsSummary={earningsSummary}
                    isEarningsLoading={isEarningsLoading}
                  />
                ) : null}
                {referralMe?.variant === 'REFEREE' ? (
                  <RefereeHeroCard
                    referredBy={referralMe.referred_by}
                    localizedText={referralMe.localized_text}
                    earningsSummary={earningsSummary}
                    isEarningsLoading={isEarningsLoading}
                  />
                ) : null}
                {referralMe ? (
                  subscriptionId ? (
                    <>
                      <CampaignsPreview />
                      <BenefitsPreview />
                    </>
                  ) : (
                    <RewardsOptInSection
                      localizedText={referralMe.localized_text}
                    />
                  )
                ) : null}
              </Box>
            ) : (
              <Box testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY} />
            )}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsMoneyDashboard;
