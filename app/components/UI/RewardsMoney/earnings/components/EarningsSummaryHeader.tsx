import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { EarningsSummaryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatMusd } from '../../utils/format';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

interface EarningsSummaryHeaderProps {
  summary: EarningsSummaryDto | null;
  isLoading: boolean;
}

interface SummaryRowProps {
  label: string;
  value: string;
  testID: string;
  emphasise?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  testID,
  emphasise = false,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
  >
    <Text
      variant={emphasise ? TextVariant.BodyMd : TextVariant.BodySm}
      color={emphasise ? TextColor.TextDefault : TextColor.TextAlternative}
    >
      {label}
    </Text>
    <Text
      variant={emphasise ? TextVariant.HeadingMd : TextVariant.BodyMd}
      fontWeight={emphasise ? FontWeight.Bold : FontWeight.Medium}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/**
 * The design's three rows, read straight off the payload.
 *
 * `claimable` is the exact net a claim would pay, so this number and the claim
 * CTA cannot disagree — there is only one of them.
 */
const EarningsSummaryHeader: React.FC<EarningsSummaryHeaderProps> = ({
  summary,
  isLoading,
}) => {
  const tw = useTailwind();

  if (isLoading && !summary) {
    return (
      <Box
        twClassName="w-full rounded-2xl bg-background-muted p-4 gap-3"
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_SUMMARY_HEADER}
      >
        <Skeleton style={tw.style('h-6 w-32 rounded-lg')} />
        <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
        <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
      </Box>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Box
      twClassName="w-full rounded-2xl bg-background-muted p-4 gap-3"
      testID={REWARDS_MONEY_TEST_IDS.EARNINGS_SUMMARY_HEADER}
    >
      <SummaryRow
        label={strings('rewards_money.earnings.claimable')}
        value={formatMusd(summary.claimable)}
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMABLE}
        emphasise
      />
      <SummaryRow
        label={strings('rewards_money.earnings.pending')}
        value={formatMusd(summary.pending)}
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_PENDING}
      />
      <SummaryRow
        label={strings('rewards_money.earnings.claimed')}
        value={formatMusd(summary.claimed)}
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMED}
      />
    </Box>
  );
};

export default EarningsSummaryHeader;
