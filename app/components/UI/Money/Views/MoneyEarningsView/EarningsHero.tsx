import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type { InterestHistoryGranularity } from '../../types/moneyInterestHistory';
import { DUST_THRESHOLD, moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsHeroProps {
  totalEarnedUsd: number;
  periodEarningsUsd: number;
  periodStart: string;
  periodEndExclusive: string;
  periodGranularity: InterestHistoryGranularity;
}

const formatEarningsAmountUsd = (amountUsd: number): string =>
  amountUsd !== 0 && Math.abs(amountUsd) < DUST_THRESHOLD
    ? '<$0.01'
    : moneyFormatUsd(new BigNumber(amountUsd));

const formatPeriodDateRange = (
  periodStart: string,
  periodEndExclusive: string,
  granularity: InterestHistoryGranularity,
): string => {
  const options =
    granularity === 'month'
      ? {
          month: 'short' as const,
          year: 'numeric' as const,
          timeZone: 'UTC' as const,
        }
      : {
          month: 'short' as const,
          day: 'numeric' as const,
          timeZone: 'UTC' as const,
        };
  const formatter = getIntlDateTimeFormatter(I18n.locale, options);
  const startLabel = formatter.format(new Date(periodStart));
  const endLabel = formatter.format(
    new Date(Date.parse(periodEndExclusive) - 1),
  );

  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const EarningsHero = ({
  totalEarnedUsd,
  periodEarningsUsd,
  periodStart,
  periodEndExclusive,
  periodGranularity,
}: EarningsHeroProps): React.ReactElement => (
  <Box testID={MoneyEarningsViewTestIds.HERO} twClassName="gap-1">
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('money.earnings.total_earned')}
    </Text>
    <Text
      testID={MoneyEarningsViewTestIds.HERO_TOTAL}
      variant={TextVariant.DisplayLg}
      fontWeight={FontWeight.Bold}
    >
      {formatEarningsAmountUsd(totalEarnedUsd)}
    </Text>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="items-start gap-1">
      <Text
        testID={MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT}
        variant={TextVariant.BodyMd}
        color={
          periodEarningsUsd === 0
            ? TextColor.TextDefault
            : TextColor.SuccessDefault
        }
      >
        {periodEarningsUsd === 0
          ? formatEarningsAmountUsd(periodEarningsUsd)
          : `▲ ${formatEarningsAmountUsd(periodEarningsUsd)}`}
      </Text>
      <Text
        testID={MoneyEarningsViewTestIds.HERO_PERIOD_DATE}
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
      >
        ·{' '}
        {formatPeriodDateRange(
          periodStart,
          periodEndExclusive,
          periodGranularity,
        )}
      </Text>
    </Box>
  </Box>
);

export default EarningsHero;
