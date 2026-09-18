import React from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderStandard,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import Routes from '../../../../constants/navigation/Routes';
import {
  KOL_PERFORMANCE_FIXTURE,
  KOL_PERFORMANCE_PREVIEW_COUNT,
} from '../components/KolDashboard/rewardsUiFixtures';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from '../components/KolDashboard/PerformanceActivityRows';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import type { RewardsStackParamList } from '../types/navigation';

const FUNNEL_COPY: Record<
  (typeof KOL_PERFORMANCE_FIXTURE.funnel)[number]['key'],
  { title: string; description: string }
> = {
  codeUses: {
    title: 'rewards.kol.funnel_code_uses',
    description: 'rewards.kol.funnel_code_uses_description',
  },
  confirmed: {
    title: 'rewards.kol.funnel_confirmed',
    description: 'rewards.kol.funnel_confirmed_description',
  },
  active: {
    title: 'rewards.kol.funnel_active',
    description: 'rewards.kol.funnel_active_description',
  },
  feeGenerating: {
    title: 'rewards.kol.funnel_fee_generating',
    description: 'rewards.kol.funnel_fee_generating_description',
  },
};

const RewardsPerformanceView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<RewardsStackParamList, 'RewardsPerformanceView'>>();
  const hideReferrals = Boolean(params?.hideReferrals);
  const previewCommissions = KOL_PERFORMANCE_FIXTURE.commissions.slice(
    0,
    KOL_PERFORMANCE_PREVIEW_COUNT,
  );
  const previewRebates = KOL_PERFORMANCE_FIXTURE.rebates.slice(
    0,
    KOL_PERFORMANCE_PREVIEW_COUNT,
  );

  return (
    <ErrorBoundary navigation={navigation} view="RewardsPerformanceView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_VIEW}
      >
        <HeaderStandard
          title={strings('rewards.kol.performance_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          {!hideReferrals && (
            <>
              <SectionHeader title={strings('rewards.kol.referrals')}>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('rewards.kol.last_30_days_updated_daily')}
                </Text>
              </SectionHeader>
              <Box twClassName="px-4">
                <Text variant={TextVariant.DisplayMd}>
                  {KOL_PERFORMANCE_FIXTURE.eligibleFeesLabel}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('rewards.kol.eligible_fees')}
                </Text>
                <Box
                  twClassName="mt-6 gap-5"
                  testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL}
                >
                  {KOL_PERFORMANCE_FIXTURE.funnel.map((row) => (
                    <Box key={row.key}>
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        justifyContent={BoxJustifyContent.Between}
                      >
                        <Text variant={TextVariant.BodyMd}>
                          {strings(FUNNEL_COPY[row.key].title)}
                        </Text>
                        <Text variant={TextVariant.BodyMd}>{row.value}</Text>
                      </Box>
                      <Box twClassName="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <Box
                          twClassName="h-2 rounded-full bg-icon-default"
                          style={tw.style(
                            `w-[${Math.round(
                              (row.value / KOL_PERFORMANCE_FIXTURE.funnelMax) *
                                100,
                            )}%]`,
                          )}
                        />
                      </Box>
                      <Text
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextMuted}
                        twClassName="mt-1"
                      >
                        {strings(FUNNEL_COPY[row.key].description)}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>

              <SectionDivider marginVertical={8} />
            </>
          )}

          {/* pt-0 keeps the divider's 32px from stacking with the header's own
              top padding; invited users skip that divider so the first
              section keeps the header's default top padding. */}
          <SectionHeader
            title={strings('rewards.kol.trading_commissions_section')}
            isInteractive
            onPress={() =>
              navigation.navigate(Routes.REWARDS_TRADING_COMMISSIONS_VIEW)
            }
            twClassName={hideReferrals ? 'pb-4' : 'pt-0 pb-4'}
            testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS_HEADER}
          />
          <Box twClassName="px-4">
            <Box
              twClassName="gap-4"
              testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_COMMISSIONS}
            >
              {previewCommissions.map((item) => (
                <PerformanceCommissionRow key={item.id} item={item} />
              ))}
            </Box>
          </Box>

          <SectionDivider marginVertical={8} />

          <SectionHeader
            title={strings('rewards.kol.trading_rebates')}
            isInteractive
            onPress={() =>
              navigation.navigate(Routes.REWARDS_TRADING_REBATES_VIEW)
            }
            twClassName="pt-0 pb-4"
            testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES_HEADER}
          />
          <Box twClassName="px-4 pb-8">
            <Box
              twClassName="gap-4"
              testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_REBATES}
            >
              {previewRebates.map((item) => (
                <PerformanceRebateRow key={item.id} item={item} />
              ))}
            </Box>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsPerformanceView;
