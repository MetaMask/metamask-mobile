import React, { memo } from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { TokenPerformance } from '../hooks/useTokenPerformance';

export const TOKEN_DETAILS_V1_PERFORMANCE_TEST_ID =
  'token-details-v1-performance';

/** Gray dash shown when a cell has no data (never render 0%). */
const MISSING_VALUE_LABEL = '—';

const PERFORMANCE_VALUE_TEST_ID_PREFIX = 'token-details-v1-performance-value';

interface PerformanceCellProps {
  label: string;
  value: number | null;
  isFirstCell: boolean;
  testID: string;
}

const formatPerformanceValue = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

const PerformanceCell = ({
  label,
  value,
  isFirstCell,
  testID,
}: PerformanceCellProps) => {
  const hasValue = value !== null;

  return (
    <Box
      twClassName={`flex-1 items-center py-2 ${
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
        testID={testID}
      >
        {hasValue ? formatPerformanceValue(value) : MISSING_VALUE_LABEL}
      </Text>
    </Box>
  );
};

export interface TokenDetailsV1PerformanceProps {
  performance: TokenPerformance;
}

/**
 * Performance section on the V1 Overview tab: 5m / 1h / 4h / 24h percent
 * changes in a single bordered card. Missing values degrade to a gray dash.
 */
const TokenDetailsV1Performance = memo(
  ({ performance }: TokenDetailsV1PerformanceProps) => {
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
      <Box testID={TOKEN_DETAILS_V1_PERFORMANCE_TEST_ID}>
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
  },
);

TokenDetailsV1Performance.displayName = 'TokenDetailsV1Performance';

export default TokenDetailsV1Performance;
