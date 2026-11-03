import React, { memo } from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import type { TokenPerformance } from '../../hooks/useTokenPerformance';

export const OVERVIEW_TAB_PERFORMANCE_TEST_ID =
  'token-details-overview-tab-performance';

const MISSING_VALUE_LABEL = '—';

const PERFORMANCE_VALUE_TEST_ID_PREFIX =
  'token-details-overview-tab-performance-value';

const COMPACT_PERCENT_THRESHOLD = 1000;

const compactPercentFormatter = getIntlNumberFormatter('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

interface PerformanceCellProps {
  label: string;
  value: number | null;
  isFirstCell: boolean;
  testID: string;
}

const formatPerformanceValue = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  if (Math.abs(value) >= COMPACT_PERCENT_THRESHOLD) {
    return `${sign}${compactPercentFormatter.format(value)}%`;
  }
  return `${sign}${value.toFixed(2)}%`;
};

const PerformanceCell = ({
  label,
  value,
  isFirstCell,
  testID,
}: PerformanceCellProps) => {
  const hasValue = value !== null;

  return (
    <Box
      twClassName={`flex-1 items-center px-0.5 py-2 ${
        isFirstCell ? '' : 'border-l border-muted'
      }`}
    >
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={
          !hasValue
            ? TextColor.TextAlternative
            : value >= 0
              ? TextColor.SuccessDefault
              : TextColor.ErrorDefault
        }
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        testID={testID}
      >
        {hasValue ? formatPerformanceValue(value) : MISSING_VALUE_LABEL}
      </Text>
    </Box>
  );
};

export interface PerformanceSectionProps {
  performance: TokenPerformance;
}

const PerformanceSection = memo(({ performance }: PerformanceSectionProps) => {
  const cells: PerformanceCellProps[] = [
    {
      label: '5m',
      value: performance.fiveMinute,
      isFirstCell: true,
      testID: `${PERFORMANCE_VALUE_TEST_ID_PREFIX}-5m`,
    },
    {
      label: '1h',
      value: performance.oneHour,
      isFirstCell: false,
      testID: `${PERFORMANCE_VALUE_TEST_ID_PREFIX}-1h`,
    },
    {
      label: '4h',
      value: performance.fourHour,
      isFirstCell: false,
      testID: `${PERFORMANCE_VALUE_TEST_ID_PREFIX}-4h`,
    },
    {
      label: '24h',
      value: performance.twentyFourHour,
      isFirstCell: false,
      testID: `${PERFORMANCE_VALUE_TEST_ID_PREFIX}-24h`,
    },
  ];

  return (
    <Box testID={OVERVIEW_TAB_PERFORMANCE_TEST_ID}>
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
        twClassName="mb-3"
      >
        {strings('token_details_v1.performance.title')}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="rounded-2xl border border-muted"
      >
        {cells.map((cell) => (
          <PerformanceCell key={cell.label} {...cell} />
        ))}
      </Box>
    </Box>
  );
});

PerformanceSection.displayName = 'PerformanceSection';

export default PerformanceSection;
