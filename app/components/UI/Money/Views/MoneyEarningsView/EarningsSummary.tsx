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
import { strings } from '../../../../../../locales/i18n';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsSummaryProps {
  thisMonth: number;
  lifetime: number;
  projectedOneYear: number | undefined;
}

interface SummaryRow {
  label: string;
  value: number;
  sublabel?: string;
}

const isFiniteNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

const formatSignedUsd = (amount: number): string => {
  const formattedAmount = moneyFormatUsd(new BigNumber(amount));
  return amount > 0 ? `+${formattedAmount}` : formattedAmount;
};

const EarningsSummary = ({
  thisMonth,
  lifetime,
  projectedOneYear,
}: EarningsSummaryProps): React.ReactElement => {
  const tw = useTailwind();
  const rows: SummaryRow[] = [
    {
      label: strings('money.earnings.last_30_days'),
      value: thisMonth,
    },
    // TODO: Replace 1Y earnings with a lifetime endpoint once available.
    // 1Y is not a valid lifetime substitute after the account is older than one year.
    {
      label: strings('money.earnings.lifetime'),
      value: lifetime,
    },
    ...(isFiniteNumber(projectedOneYear)
      ? [
          {
            label: strings('money.earnings.projected_in_1_year'),
            value: projectedOneYear,
            sublabel: strings('money.earnings.projection_disclaimer'),
          },
        ]
      : []),
  ];

  return (
    <Box testID={MoneyEarningsViewTestIds.SUMMARY}>
      {rows.map(({ label, value, sublabel }) => (
        <Box
          key={label}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          style={tw.style('justify-between gap-4 py-3.5')}
        >
          <Box twClassName="min-w-0 flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {label}
            </Text>
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
            color={value > 0 ? TextColor.SuccessDefault : TextColor.TextDefault}
            twClassName="text-right"
          >
            {formatSignedUsd(value)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export default EarningsSummary;
