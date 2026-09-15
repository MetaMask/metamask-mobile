import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import {
  formatSignedUsd,
  KOL_PERFORMANCE_FIXTURE,
} from '../components/KolDashboard/rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';

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

const COMMISSION_AVATAR_CLASS: Record<string, string> = {
  ETH: 'bg-muted',
  SOL: 'bg-info-muted',
  BTC: 'bg-warning-muted',
};

const RewardsPerformanceView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

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
          <Box twClassName="px-4 pb-8">
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.kol.referrals')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-1"
            >
              {strings('rewards.kol.last_30_days_updated_daily')}
            </Text>
            <Text variant={TextVariant.DisplayMd} twClassName="mt-4">
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
                  <Box twClassName="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <Box
                      twClassName="h-1 rounded-full bg-default"
                      style={{
                        width: `${(row.value / KOL_PERFORMANCE_FIXTURE.funnelMax) * 100}%`,
                      }}
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

            <Box twClassName="mt-8 border-t border-muted pt-6">
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.kol.trading_commissions_section')}
              </Text>
              <Box twClassName="mt-4 gap-4">
                {KOL_PERFORMANCE_FIXTURE.commissions.map((item) => (
                  <Box
                    key={item.id}
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-3"
                  >
                    <Box
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Center}
                      twClassName={`h-10 w-10 rounded-full ${COMMISSION_AVATAR_CLASS[item.symbol] ?? 'bg-muted'}`}
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                      >
                        {item.symbol.slice(0, 1)}
                      </Text>
                    </Box>
                    <Box twClassName="flex-1">
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {item.label ?? item.symbol}
                      </Text>
                      <Text
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextAlternative}
                      >
                        {item.relativeTime}
                      </Text>
                    </Box>
                    <Box alignItems={BoxAlignItems.End}>
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.SuccessDefault}
                      >
                        {formatSignedUsd(item.amount)}
                      </Text>
                      <Text
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextAlternative}
                      >
                        {item.copiedTimes === 1
                          ? strings('rewards.kol.copied_once')
                          : strings('rewards.kol.copied_times', {
                              count: item.copiedTimes,
                            })}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsPerformanceView;
