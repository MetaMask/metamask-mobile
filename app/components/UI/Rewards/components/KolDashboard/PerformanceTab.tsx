import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { navigateToRewardsRoute } from '../../utils';
import {
  KOL_PERFORMANCE_FIXTURE,
  KOL_PERFORMANCE_PREVIEW_COUNT,
} from './rewardsUiFixtures';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from './PerformanceActivityRows';
import ReferralFunnelBar from './ReferralFunnelBar';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const FUNNEL_COPY: Record<
  (typeof KOL_PERFORMANCE_FIXTURE.funnel)[number]['key'],
  { title: string; description: string }
> = {
  codeUses: {
    title: 'rewards.kol.funnel_code_uses',
    description: 'rewards.kol.funnel_code_uses_description',
  },
  active: {
    title: 'rewards.kol.funnel_active',
    description: 'rewards.kol.funnel_active_description',
  },
};

interface PerformanceTabProps {
  hideReferrals?: boolean;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  hideReferrals = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const previewCommissions = KOL_PERFORMANCE_FIXTURE.commissions.slice(
    0,
    KOL_PERFORMANCE_PREVIEW_COUNT,
  );
  const previewRebates = KOL_PERFORMANCE_FIXTURE.rebates.slice(
    0,
    KOL_PERFORMANCE_PREVIEW_COUNT,
  );

  return (
    <Box testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_VIEW}>
      {!hideReferrals && (
        <>
          <SectionHeader
            title={strings('rewards.kol.referrals')}
            twClassName="pt-4 pb-4"
          >
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
              twClassName="mt-4 gap-4"
              testID={KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL}
            >
              {KOL_PERFORMANCE_FIXTURE.funnel.map((row, index) => (
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
                  <ReferralFunnelBar
                    ratio={row.value / KOL_PERFORMANCE_FIXTURE.funnelMax}
                    index={index}
                    testID={`${KOL_DASHBOARD_SELECTORS.PERFORMANCE_FUNNEL_BAR}-${row.key}`}
                  />
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
          section carries the tabs-to-content inset instead. The heading's own
          line-height reads as extra space, so this tab needs less than the
          card-led tabs to look level with them. */}
      <SectionHeader
        title={strings('rewards.kol.trading_commissions_section')}
        isInteractive
        onPress={() =>
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
          )
        }
        twClassName={hideReferrals ? 'pt-4 pb-4' : 'pt-0 pb-4'}
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
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_TRADING_REBATES_VIEW,
          )
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
    </Box>
  );
};

export default PerformanceTab;
