import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  SectionDivider,
  SectionHeader,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import {
  selectReferralFunnelEntry,
  selectReferralMeLocalizedText,
} from '../../../../../../reducers/rewardsMoney/selectors';
import { strings } from '../../../../../../../locales/i18n';
import { navigateToRewardsRoute } from '../../../utils';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { useReferralFunnel } from '../../../hooks/useReferralFunnel';
import { useCommissions } from '../../../hooks/useCommissions';
import { useCashbackLedger } from '../../../hooks/useCashbackLedger';
import { PERFORMANCE_PREVIEW_COUNT } from '../performancePreview';
import ReferralFunnelBar from '../ReferralFunnelBar';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from '../PerformanceActivityRows';

export const PERFORMANCE_TAB_TEST_IDS = {
  CONTAINER: 'rewards-money-performance-tab',
  FUNNEL: 'rewards-money-performance-funnel',
  FUNNEL_BAR: 'rewards-money-performance-funnel-bar',
  COMMISSIONS: 'rewards-money-performance-commissions',
  COMMISSIONS_HEADER: 'rewards-money-performance-commissions-header',
  REBATES: 'rewards-money-performance-rebates',
  REBATES_HEADER: 'rewards-money-performance-rebates-header',
  FUNNEL_ERROR: 'rewards-money-performance-funnel-error',
  COMMISSIONS_ERROR: 'rewards-money-performance-commissions-error',
  REBATES_ERROR: 'rewards-money-performance-rebates-error',
} as const;

interface PerformanceTabProps {
  profileId: string;
  variant: 'REFERRER' | 'REFEREE' | 'NONE';
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  profileId,
  variant,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isReferrer = variant === 'REFERRER';
  const isReferee = variant === 'REFEREE';
  const showCommissions = isReferrer || isReferee;
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const funnelEntry = useSelector((state: RootState) =>
    selectReferralFunnelEntry(state, profileId),
  );
  const { fetchReferralFunnel } = useReferralFunnel(profileId, {
    enabled: isReferrer,
  });
  const commissions = useCommissions(profileId, { enabled: showCommissions });
  const rebates = useCashbackLedger(profileId, { enabled: isReferee });

  if (!localizedText) {
    return null;
  }

  const previewCommissions = (commissions.items ?? []).slice(
    0,
    PERFORMANCE_PREVIEW_COUNT,
  );
  const previewRebates = (rebates.items ?? []).slice(
    0,
    PERFORMANCE_PREVIEW_COUNT,
  );
  const funnel = funnelEntry?.data;
  const funnelMax = Math.max(funnel?.enrolled ?? 0, 1);
  const funnelRows = funnel
    ? [
        {
          key: 'confirmed' as const,
          value: funnel.enrolled,
          title: localizedText.funnelConfirmed,
          description: localizedText.funnelConfirmedDescription,
        },
        {
          key: 'feeGenerating' as const,
          value: funnel.earning_generating,
          title: localizedText.funnelFeeGenerating,
          description: localizedText.funnelFeeGeneratingDescription,
        },
      ]
    : [];
  const commissionsTitle = isReferrer
    ? localizedText.tradeCommissions
    : localizedText.tradingCommissionsSection;
  const commissionsLoading =
    showCommissions && commissions.isLoading && !commissions.items;
  const rebatesLoading = isReferee && rebates.isLoading && !rebates.items;
  const funnelLoading =
    isReferrer && !funnel && (!funnelEntry || Boolean(funnelEntry.loading));

  return (
    <Box testID={PERFORMANCE_TAB_TEST_IDS.CONTAINER}>
      {isReferrer ? (
        <>
          <SectionHeader
            title={localizedText.referrals}
            twClassName="pt-6 pb-4"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.last30DaysUpdatedDaily}
            </Text>
          </SectionHeader>
          <Box twClassName="px-4">
            {funnelEntry?.error && !funnel ? (
              <RewardsErrorBanner
                title={strings(
                  'rewards.referral_details_error.error_fetching_title',
                )}
                description={strings(
                  'rewards.referral_details_error.error_fetching_description',
                )}
                onConfirm={() => fetchReferralFunnel({ forceFresh: true })}
                confirmButtonLabel={strings(
                  'rewards.referral_details_error.retry_button',
                )}
                onConfirmLoading={Boolean(funnelEntry.loading)}
                testID={PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR}
              />
            ) : null}
            {funnelLoading ? (
              <Skeleton style={tw.style('h-24 w-full rounded-xl')} />
            ) : null}
            {funnel ? (
              <Box twClassName="gap-5" testID={PERFORMANCE_TAB_TEST_IDS.FUNNEL}>
                {funnelRows.map((row, index) => (
                  <Box key={row.key}>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      justifyContent={BoxJustifyContent.Between}
                    >
                      <Text variant={TextVariant.BodyMd}>{row.title}</Text>
                      <Text variant={TextVariant.BodyMd}>{row.value}</Text>
                    </Box>
                    <ReferralFunnelBar
                      ratio={row.value / funnelMax}
                      index={index}
                      testID={`${PERFORMANCE_TAB_TEST_IDS.FUNNEL_BAR}-${row.key}`}
                    />
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextMuted}
                      twClassName="mt-1"
                    >
                      {row.description}
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
          <SectionDivider marginVertical={8} />
        </>
      ) : null}

      {showCommissions ? (
        <>
          <SectionHeader
            title={commissionsTitle}
            isInteractive
            onPress={() =>
              navigateToRewardsRoute(
                navigation,
                Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
              )
            }
            twClassName={isReferrer ? 'pt-0 pb-4' : 'pt-6 pb-4'}
            testID={PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER}
          />
          <Box twClassName="px-4">
            {commissions.error && previewCommissions.length === 0 ? (
              <RewardsErrorBanner
                title={strings(
                  'rewards.referral_details_error.error_fetching_title',
                )}
                description={strings(
                  'rewards.referral_details_error.error_fetching_description',
                )}
                onConfirm={commissions.retry}
                confirmButtonLabel={strings(
                  'rewards.referral_details_error.retry_button',
                )}
                testID={PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR}
              />
            ) : null}
            {commissionsLoading ? (
              <TradingActivityListSkeleton rows={PERFORMANCE_PREVIEW_COUNT} />
            ) : (
              <Box
                twClassName="gap-4"
                testID={PERFORMANCE_TAB_TEST_IDS.COMMISSIONS}
              >
                {previewCommissions.map((item) => (
                  <PerformanceCommissionRow
                    key={item.id}
                    item={item}
                    localizedText={localizedText}
                  />
                ))}
              </Box>
            )}
          </Box>
        </>
      ) : null}

      {isReferee ? (
        <>
          <SectionDivider marginVertical={8} />
          <SectionHeader
            title={localizedText.tradingRebates}
            isInteractive
            onPress={() =>
              navigateToRewardsRoute(
                navigation,
                Routes.REWARDS_TRADING_REBATES_VIEW,
              )
            }
            twClassName="pt-0 pb-4"
            testID={PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER}
          />
          <Box twClassName="px-4 pb-8">
            {rebates.error && previewRebates.length === 0 ? (
              <RewardsErrorBanner
                title={strings(
                  'rewards.referral_details_error.error_fetching_title',
                )}
                description={strings(
                  'rewards.referral_details_error.error_fetching_description',
                )}
                onConfirm={rebates.retry}
                confirmButtonLabel={strings(
                  'rewards.referral_details_error.retry_button',
                )}
                testID={PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR}
              />
            ) : null}
            {rebatesLoading ? (
              <TradingActivityListSkeleton rows={PERFORMANCE_PREVIEW_COUNT} />
            ) : (
              <Box
                twClassName="gap-4"
                testID={PERFORMANCE_TAB_TEST_IDS.REBATES}
              >
                {previewRebates.map((item) => (
                  <PerformanceRebateRow
                    key={item.id}
                    item={item}
                    localizedText={localizedText}
                  />
                ))}
              </Box>
            )}
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default PerformanceTab;
