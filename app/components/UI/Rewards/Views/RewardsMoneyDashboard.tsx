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
  SectionDivider,
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
import { selectReferralMeEntry } from '../../../../reducers/rewardsMoney/selectors';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignsPreview from '../components/Campaigns/CampaignsPreview';
import BenefitsPreview from '../components/Benefits/BenefitsPreview';
import RefererHeroCard from '../components/Money/RefererHeroCard';
import RefereeHeroCard from '../components/Money/RefereeHeroCard';
import RewardsOptInSection from '../components/Money/RewardsOptInSection';
import RewardsTabSkeleton from '../components/RewardsTabSkeleton/RewardsTabSkeleton';
import { useSessionProfileId } from '../hooks/useReferralMe';
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
  CAMPAIGNS_SECTION: 'rewards-money-dashboard-campaigns-section',
  BENEFITS_SECTION: 'rewards-money-dashboard-benefits-section',
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
  const [activeTab, setActiveTab] = useState<RewardsMoneyTab>('waysToEarn');

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
      },
    ],
    [localizedText],
  );

  const headerEndAccessory = (
    <Box twClassName="flex-row items-center gap-2">
      <Box twClassName="h-8 w-8 items-center justify-center">
        <Icon
          name={IconName.Chart}
          size={IconSize.Lg}
          accessible
          accessibilityLabel={localizedText?.performanceTitle}
          testID={REWARDS_MONEY_DASHBOARD_TEST_IDS.CHART_BUTTON}
        />
      </Box>
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

  if (!isProfileResolved || !profileId || !referralMe) {
    // The same surface the tab shows while the persona resolves, so the two
    // waits read as one screen rather than a skeleton swapping for another.
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
                {referralMe?.variant === 'REFERRER' ? (
                  <RefererHeroCard
                    profileId={profileId}
                    referralCode={referralMe.referral_code}
                    localizedText={referralMe.localized_text}
                  />
                ) : null}
                {referralMe?.variant === 'REFEREE' ? (
                  <RefereeHeroCard
                    profileId={profileId}
                    referredBy={referralMe.referred_by}
                    localizedText={referralMe.localized_text}
                  />
                ) : null}
                {referralMe ? (
                  subscriptionId ? (
                    <>
                      <Box
                        testID={
                          REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION
                        }
                      >
                        <SectionDivider
                          marginVertical={0}
                          twClassName="mt-8 mb-5"
                        />
                        <CampaignsPreview />
                      </Box>
                      <Box
                        testID={
                          REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION
                        }
                      >
                        <SectionDivider
                          marginVertical={0}
                          twClassName="mt-8 mb-5"
                        />
                        <BenefitsPreview />
                      </Box>
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
