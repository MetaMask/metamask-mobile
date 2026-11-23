import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  FontFamily,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type { InterestHistoryGranularity } from '../../types/moneyInterestHistory';
import { formatSignedUsdWithThreshold } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsHeroProps {
  totalEarnedUsd: number;
  periodStart: string;
  periodEndExclusive: string;
  periodGranularity: InterestHistoryGranularity;
  rangeStart: string;
  rangeEndExclusive: string;
}

const formatPeriodDateRange = (
  periodStart: string,
  periodEndExclusive: string,
  granularity: InterestHistoryGranularity,
  rangeStart: string,
  rangeEndExclusive: string,
): string => {
  const startDate = new Date(periodStart);
  const endDate = new Date(Date.parse(periodEndExclusive) - 1);
  const rangeStartDate = new Date(rangeStart);
  const rangeEndDate = new Date(Date.parse(rangeEndExclusive) - 1);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    timeZone: 'UTC',
  };

  if (granularity !== 'month') {
    options.day = 'numeric';
  }

  if (rangeStartDate.getUTCFullYear() !== rangeEndDate.getUTCFullYear()) {
    options.year = 'numeric';
  }

  const formatter = getIntlDateTimeFormatter(I18n.locale, options);
  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);

  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const EarningsHero = ({
  totalEarnedUsd,
  periodStart,
  periodEndExclusive,
  periodGranularity,
  rangeStart,
  rangeEndExclusive,
}: EarningsHeroProps): React.ReactElement => {
  const color =
    totalEarnedUsd > 0 ? TextColor.SuccessDefault : TextColor.TextDefault;

  return (
    <Box testID={MoneyEarningsViewTestIds.HERO} twClassName="gap-1">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('money.earnings.total_earned')}
      </Text>
      <Text
        testID={MoneyEarningsViewTestIds.HERO_TOTAL}
        variant={TextVariant.AmountDisplayLg}
        fontFamily={FontFamily.Hero}
        fontWeight={FontWeight.Bold}
        color={color}
      >
        {formatSignedUsdWithThreshold(totalEarnedUsd)}
      </Text>
      <Text
        testID={MoneyEarningsViewTestIds.HERO_PERIOD_DATE}
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
      >
        {formatPeriodDateRange(
          periodStart,
          periodEndExclusive,
          periodGranularity,
          rangeStart,
          rangeEndExclusive,
        )}
      </Text>
    </Box>
  );
};

export default EarningsHero;
