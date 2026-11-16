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
import type { InterestHistoryGranularity } from '../../hooks/useMoneyHistoricalEarnings';
import { DUST_THRESHOLD, moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsHeroProps {
  totalEarned: number;
  periodEarnings: number;
  periodStart: string;
  periodEnd: string;
  periodGranularity: InterestHistoryGranularity;
}

const formatEarningsAmount = (amount: number): string =>
  amount !== 0 && Math.abs(amount) < DUST_THRESHOLD
    ? '<$0.01'
    : moneyFormatUsd(new BigNumber(amount));

const formatPeriodDateRange = (
  start: string,
  end: string,
  granularity: InterestHistoryGranularity,
): string => {
  const options =
    granularity === 'month'
      ? {
          month: 'short' as const,
          timeZone: 'UTC' as const,
        }
      : {
          month: 'short' as const,
          day: 'numeric' as const,
          timeZone: 'UTC' as const,
        };
  const formatter = getIntlDateTimeFormatter(I18n.locale, options);
  const startLabel = formatter.format(new Date(start));
  const endLabel = formatter.format(new Date(Date.parse(end) - 1));

  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const EarningsHero = ({
  totalEarned,
  periodEarnings,
  periodStart,
  periodEnd,
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
      {formatEarningsAmount(totalEarned)}
    </Text>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="items-start gap-1">
      <Text
        testID={MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT}
        variant={TextVariant.BodyMd}
        color={
          periodEarnings === 0
            ? TextColor.TextDefault
            : TextColor.SuccessDefault
        }
      >
        {periodEarnings === 0
          ? formatEarningsAmount(periodEarnings)
          : `▲ ${formatEarningsAmount(periodEarnings)}`}
      </Text>
      <Text
        testID={MoneyEarningsViewTestIds.HERO_PERIOD_DATE}
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
      >
        · {formatPeriodDateRange(periodStart, periodEnd, periodGranularity)}
      </Text>
    </Box>
  </Box>
);

export default EarningsHero;
