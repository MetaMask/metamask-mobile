import React from 'react';
import {
  Box,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  FontFamily,
} from '@metamask/design-system-react-native';
import { typography } from '@metamask/design-tokens';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type { InterestHistoryGranularity } from '../../types/moneyInterestHistory';
import { formatSignedUsdWithThreshold } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import { isCrossYearRange } from './EarningsChart.utils';

const HERO_TOTAL_SKELETON_HEIGHT = typography.sAmountDisplayLg.lineHeight;
const HERO_TOTAL_SKELETON_WIDTH = 120;
const HERO_PERIOD_SKELETON_HEIGHT = typography.sBodyMD.lineHeight;
const HERO_PERIOD_SKELETON_WIDTH = 100;

type EarningsHeroProps =
  | {
      isLoading: true;
      totalEarnedUsd?: never;
      periodStart?: never;
      periodEndExclusive?: never;
      periodGranularity?: never;
      rangeStart?: never;
      rangeEndExclusive?: never;
    }
  | {
      isLoading?: false;
      totalEarnedUsd: number;
      periodStart: string;
      periodEndExclusive: string;
      periodGranularity: InterestHistoryGranularity;
      rangeStart: string;
      rangeEndExclusive: string;
    };

const formatPeriodDateRange = (
  periodStart: string,
  periodEndExclusive: string,
  granularity: InterestHistoryGranularity,
  rangeStart: string,
  rangeEndExclusive: string,
): string => {
  const startDate = new Date(periodStart);
  const endDate = new Date(Date.parse(periodEndExclusive) - 1);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    timeZone: 'UTC',
  };

  if (granularity !== 'month') {
    options.day = 'numeric';
  }

  if (isCrossYearRange(rangeStart, rangeEndExclusive)) {
    options.year = 'numeric';
  }

  const formatter = getIntlDateTimeFormatter(I18n.locale, options);
  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);

  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const EarningsHero = (props: EarningsHeroProps): React.ReactElement => {
  if (props.isLoading) {
    return (
      <Box testID={MoneyEarningsViewTestIds.HERO} twClassName="gap-1">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('money.earnings.total_earned')}
        </Text>
        <Skeleton
          height={HERO_TOTAL_SKELETON_HEIGHT}
          width={HERO_TOTAL_SKELETON_WIDTH}
          testID={MoneyEarningsViewTestIds.HERO_TOTAL_SKELETON}
        />
        <Skeleton
          height={HERO_PERIOD_SKELETON_HEIGHT}
          width={HERO_PERIOD_SKELETON_WIDTH}
          testID={MoneyEarningsViewTestIds.HERO_PERIOD_DATE_SKELETON}
        />
      </Box>
    );
  }

  const {
    totalEarnedUsd,
    periodStart,
    periodEndExclusive,
    periodGranularity,
    rangeStart,
    rangeEndExclusive,
  } = props;
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
