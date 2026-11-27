import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  IconColor,
  IconName,
  SectionDivider,
  SectionHeader,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  EarningClaimFamily,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../locales/i18n';
import {
  familyDisplayTotals,
  type FamilyDisplayTotals,
} from '../../utils/claimEarnings';
import { isPositiveBaseUnits } from '../../utils/formatUtils';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  deriveBreakdownErrorSource,
  musdAmount,
  type SummarySectionState,
} from './Tabs/earningsSummarySection';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from './EarnFamilyEarningsSection.testIds';

/** A plain statistic beside the amounts, such as a referral count. */
export interface EarnFamilyExtraRow {
  key: string;
  label: string;
  value: string;
  iconName?: IconName;
  /** Above the amounts. The default is below them. */
  placement?: 'before' | 'after';
}

type AmountRowKey = keyof FamilyDisplayTotals;

interface AmountRow {
  key: AmountRowKey;
  label: (localizedText: ReferralLocalizedText) => string;
  iconName: IconName;
  /** Held, blocked and voided stay off the page when they are zero. */
  hideWhenZero: boolean;
}

/** The Claims paused sheet's order, without its lifetime total row. */
const AMOUNT_ROWS: AmountRow[] = [
  {
    key: 'claimable',
    label: (text) => text.availableToClaim,
    iconName: IconName.Received,
    hideWhenZero: false,
  },
  {
    key: 'pending',
    label: (text) => text.pending,
    iconName: IconName.Clock,
    hideWhenZero: false,
  },
  {
    key: 'held',
    label: (text) => text.held,
    iconName: IconName.Lock,
    hideWhenZero: true,
  },
  {
    key: 'blocked',
    label: (text) => text.blocked,
    iconName: IconName.Danger,
    hideWhenZero: true,
  },
  {
    key: 'voided',
    label: (text) => text.voided,
    iconName: IconName.Close,
    hideWhenZero: true,
  },
  {
    key: 'claimed',
    label: (text) => text.claimed,
    iconName: IconName.Check,
    hideWhenZero: false,
  },
];

const rowIcon = (name: IconName | undefined) =>
  name ? (
    <AvatarIcon
      iconName={name}
      size={AvatarIconSize.Md}
      severity={AvatarIconSeverity.Neutral}
      iconProps={{ color: IconColor.IconAlternative }}
    />
  ) : null;

/**
 * The history row's layout: the circle, 12px, then the label, with the
 * amount at the far end. A `KeyValueRow` locks the row to 40px, which
 * squeezes the 32px circle and leaves 4px beside it.
 */
const EarningsStatRow: React.FC<{
  iconName?: IconName;
  label: string;
  value: string;
  testID: string;
}> = ({ iconName, label, value, testID }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    className="gap-3"
    testID={testID}
  >
    {rowIcon(iconName)}
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      className="flex-1"
    >
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const SKELETON_ROWS = 4;

const FamilyEarningsSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      className="gap-4 px-4"
      testID={EARN_FAMILY_EARNINGS_TEST_IDS.SKELETON}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} style={tw.style('h-5 w-full rounded-md')} />
      ))}
    </Box>
  );
};

interface EarnFamilyEarningsSectionProps {
  localizedText: ReferralLocalizedText;
  summary: SummarySectionState;
  /** The summary branch the family sits in: own trades or other people's. */
  branch: 'self_earned' | 'earned_by_others';
  family: EarningClaimFamily;
  /** Statistics around the amounts. `before` sits above them. */
  extraRows?: EarnFamilyExtraRow[];
  /** A funnel fetch failed. Shown only when the summary itself did not. */
  funnelFailed?: boolean;
  funnelRefreshing?: boolean;
  onRetry: () => void;
  onRetryFunnel?: () => void;
}

/**
 * Your earnings for one claim family: what is claimable, pending, held,
 * blocked, voided and already claimed. Held, blocked and voided appear only
 * while they are above zero.
 */
const EarnFamilyEarningsSection: React.FC<EarnFamilyEarningsSectionProps> = ({
  localizedText,
  summary,
  branch,
  family,
  extraRows = [],
  funnelFailed = false,
  funnelRefreshing = false,
  onRetry,
  onRetryFunnel,
}) => {
  const hasSummary = summary.data !== null;
  const totals = familyDisplayTotals(summary.data, branch, family);
  const rows = AMOUNT_ROWS.filter(
    (row) => !row.hideWhenZero || isPositiveBaseUnits(totals[row.key]),
  );
  const leadingRows = extraRows.filter((row) => row.placement === 'before');
  const trailingRows = extraRows.filter((row) => row.placement !== 'before');

  const statistic = (row: EarnFamilyExtraRow) => (
    <EarningsStatRow
      key={row.key}
      iconName={row.iconName}
      label={row.label}
      value={row.value}
      testID={`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-${row.key}`}
    />
  );

  // A first load with nothing cached is a skeleton. A failure keeps the
  // rows, with a dash wherever there is no cached amount.
  const showSkeleton = summary.loading && !hasSummary && !summary.failed;
  const errorSource = deriveBreakdownErrorSource(summary.failed, funnelFailed);
  const errorCopy =
    errorSource === 'funnel'
      ? 'rewards.referral_details_error'
      : 'rewards.earnings_summary_error';

  let body: React.ReactElement;
  if (showSkeleton) {
    body = <FamilyEarningsSkeleton />;
  } else {
    body = (
      <Box
        className="gap-4 px-4"
        testID={EARN_FAMILY_EARNINGS_TEST_IDS.CONTAINER}
      >
        {rows.map((row) => (
          <EarningsStatRow
            key={row.key}
            iconName={row.iconName}
            label={row.label(localizedText)}
            value={hasSummary ? musdAmount(totals[row.key]) : '—'}
            testID={`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-${row.key}`}
          />
        ))}
        {trailingRows.map(statistic)}
      </Box>
    );
  }

  return (
    <>
      <SectionDivider marginVertical={8} />
      <SectionHeader
        // A payload cached before the server added the key has no yourEarnings.
        title={localizedText.yourEarnings ?? localizedText.breakdown}
        className="pt-0 pb-4"
        testID={EARN_FAMILY_EARNINGS_TEST_IDS.HEADER}
      />
      {leadingRows.length > 0 ? (
        <Box className="gap-4 px-4 pb-4">{leadingRows.map(statistic)}</Box>
      ) : null}
      {body}
      {errorSource ? (
        <Box className="px-4 pt-4">
          <RewardsErrorBanner
            title={strings(`${errorCopy}.error_fetching_title`)}
            description={strings(`${errorCopy}.error_fetching_description`)}
            onConfirm={
              errorSource === 'funnel' ? (onRetryFunnel ?? onRetry) : onRetry
            }
            confirmButtonLabel={strings(`${errorCopy}.retry_button`)}
            onConfirmLoading={
              errorSource === 'funnel' ? funnelRefreshing : summary.refreshing
            }
            testID={EARN_FAMILY_EARNINGS_TEST_IDS.ERROR}
          />
        </Box>
      ) : null}
      <SectionDivider marginVertical={8} />
    </>
  );
};

export default EarnFamilyEarningsSection;
