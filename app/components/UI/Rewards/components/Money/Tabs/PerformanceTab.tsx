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
import ReferralFunnelBar from '../ReferralFunnelBar';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from '../PerformanceActivityRows';

/** Rows shown under each Performance section before "see all". */
const PERFORMANCE_PREVIEW_COUNT = 5;

export const PERFORMANCE_TAB_TEST_IDS = {
  CONTAINER: 'rewards-money-performance-tab',
  FUNNEL: 'rewards-money-performance-funnel',
  FUNNEL_BAR: 'rewards-money-performance-funnel-bar',
  COMMISSIONS: 'rewards-money-performance-commissions',
  COMMISSIONS_HEADER: 'rewards-money-performance-commissions-header',
  REBATES: 'rewards-money-performance-rebates',
  REBATES_HEADER: 'rewards-money-performance-rebates-header',
  FUNNEL_SKELETON: 'rewards-money-performance-funnel-skeleton',
  FUNNEL_ERROR: 'rewards-money-performance-funnel-error',
  COMMISSIONS_ERROR: 'rewards-money-performance-commissions-error',
  REBATES_ERROR: 'rewards-money-performance-rebates-error',
} as const;

const FUNNEL_SKELETON_ROWS = [
  { title: 'w-40', bar: 'w-full', description: 'w-56' },
  { title: 'w-36', bar: 'w-2/3', description: 'w-48' },
] as const;

const ReferralFunnelSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-5" testID={PERFORMANCE_TAB_TEST_IDS.FUNNEL_SKELETON}>
      {FUNNEL_SKELETON_ROWS.map((row) => (
        <Box key={row.title}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
          >
            <Skeleton style={tw.style(`h-4 ${row.title} rounded-md`)} />
            <Skeleton style={tw.style('h-4 w-6 rounded-md')} />
          </Box>
          <Skeleton style={tw.style(`mt-2 h-2 ${row.bar} rounded-full`)} />
          <Skeleton
            style={tw.style(`mt-1 h-3 ${row.description} rounded-md`)}
          />
        </Box>
      ))}
    </Box>
  );
};

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
  const funnelError = isReferrer && Boolean(funnelEntry?.error);
  const commissionsError = showCommissions && Boolean(commissions.error);
  const rebatesError = isReferee && Boolean(rebates.error);
  // One banner for the tab. Commissions win when more than one request failed,
  // and retry refetches only that source.
  const errorSource = commissionsError
    ? 'commissions'
    : rebatesError
      ? 'rebates'
      : funnelError
        ? 'funnel'
        : null;
  const errorCopy =
    errorSource === 'funnel'
      ? 'rewards.referral_details_error'
      : 'rewards.trading_activity_error';
  const showFunnelSection = isReferrer && !(funnelError && !funnel);
  const showCommissionsSection =
    showCommissions &&
    !(
      commissionsError &&
      previewCommissions.length === 0 &&
      !commissionsLoading
    );
  const showRebatesSection =
    isReferee &&
    !(rebatesError && previewRebates.length === 0 && !rebatesLoading);

  return (
    <Box testID={PERFORMANCE_TAB_TEST_IDS.CONTAINER}>
      {errorSource ? (
        <Box twClassName="mt-3 px-4 pt-4">
          <RewardsErrorBanner
            title={strings(`${errorCopy}.error_fetching_title`)}
            description={strings(`${errorCopy}.error_fetching_description`)}
            onConfirm={() => {
              if (errorSource === 'commissions') {
                commissions.retry();
                return;
              }
              if (errorSource === 'rebates') {
                rebates.retry();
                return;
              }
              fetchReferralFunnel({ forceFresh: true });
            }}
            confirmButtonLabel={strings(`${errorCopy}.retry_button`)}
            onConfirmLoading={
              errorSource === 'funnel' ? Boolean(funnelEntry?.loading) : false
            }
            testID={
              errorSource === 'commissions'
                ? PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR
                : errorSource === 'rebates'
                  ? PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR
                  : PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR
            }
          />
        </Box>
      ) : null}
      {showFunnelSection ? (
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
            {funnelLoading ? <ReferralFunnelSkeleton /> : null}
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

      {showCommissionsSection ? (
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
            twClassName={showFunnelSection ? 'pt-0 pb-4' : 'pt-6 pb-4'}
            testID={PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER}
          />
          <Box twClassName="px-4">
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

      {showRebatesSection ? (
        <>
          {showCommissionsSection ? (
            <SectionDivider marginVertical={8} />
          ) : null}
          <SectionHeader
            title={localizedText.tradingRebates}
            isInteractive
            onPress={() =>
              navigateToRewardsRoute(
                navigation,
                Routes.REWARDS_TRADING_REBATES_VIEW,
              )
            }
            twClassName={showCommissionsSection ? 'pt-0 pb-4' : 'pt-6 pb-4'}
            testID={PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER}
          />
          <Box twClassName="px-4 pb-8">
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
