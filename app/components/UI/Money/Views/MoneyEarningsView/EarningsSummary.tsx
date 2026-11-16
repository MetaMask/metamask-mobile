import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsSummaryProps {
  thisMonth: number;
  lifetime: number;
  projectedOneYear: number;
  dataThrough: string | undefined;
}

interface SummaryRow {
  label: string;
  value: number;
  sublabel?: string;
}

const formatSignedUsd = (amount: number): string => {
  const formattedAmount = moneyFormatUsd(new BigNumber(amount));
  return amount > 0 ? `+${formattedAmount}` : formattedAmount;
};

const formatDataThrough = (timestamp: string): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

const EarningsSummary = ({
  thisMonth,
  lifetime,
  projectedOneYear,
  dataThrough,
}: EarningsSummaryProps): React.ReactElement => {
  const tw = useTailwind();
  const rows: SummaryRow[] = [
    {
      label: strings('money.earnings.this_month'),
      value: thisMonth,
    },
    // TODO: Replace 1Y earnings with a lifetime endpoint once available.
    // 1Y is not a valid lifetime substitute after the account is older than one year.
    {
      label: strings('money.earnings.lifetime'),
      value: lifetime,
    },
    {
      label: strings('money.earnings.projected_in_1_year'),
      value: projectedOneYear,
      sublabel: strings('money.earnings.projection_disclaimer'),
    },
  ];

  return (
    <Box
      style={tw.style('gap-4 rounded-xl bg-muted p-4')}
      testID={MoneyEarningsViewTestIds.SUMMARY}
    >
      {rows.map(({ label, value, sublabel }) => (
        <Box
          key={label}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="justify-between gap-4"
        >
          <Box twClassName="min-w-0 flex-1">
            <Text variant={TextVariant.BodyMd}>{label}</Text>
            {sublabel ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {sublabel}
              </Text>
            ) : null}
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-right"
          >
            {formatSignedUsd(value)}
          </Text>
        </Box>
      ))}
      {dataThrough ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('money.earnings.data_through', {
            date: formatDataThrough(dataThrough),
          })}
        </Text>
      ) : null}
    </Box>
  );
};

export default EarningsSummary;
