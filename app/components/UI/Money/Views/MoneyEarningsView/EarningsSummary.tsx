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
import { strings } from '../../../../../../locales/i18n';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsSummaryProps {
  thisMonthUsd: number;
  lifetimeUsd: number;
  projectedOneYearUsd: number | undefined;
}

interface SummaryRow {
  label: string;
  valueUsd: number;
  sublabel?: string;
}

const isFiniteNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

const formatSignedUsd = (amountUsd: number): string => {
  const formattedAmountUsd = moneyFormatUsd(new BigNumber(amountUsd));
  return amountUsd > 0 ? `+${formattedAmountUsd}` : formattedAmountUsd;
};

const EarningsSummary = ({
  thisMonthUsd,
  lifetimeUsd,
  projectedOneYearUsd,
}: EarningsSummaryProps): React.ReactElement => {
  const rows: SummaryRow[] = [
    {
      label: strings('money.earnings.last_30_days'),
      valueUsd: thisMonthUsd,
    },
    // TODO: Replace 1Y earnings with lifetime earnings once added to interest history response.
    // 1Y is not a valid lifetime substitute after the account is older than one year.
    {
      label: strings('money.earnings.lifetime'),
      valueUsd: lifetimeUsd,
    },
    ...(isFiniteNumber(projectedOneYearUsd)
      ? [
          {
            label: strings('money.earnings.projected_in_1_year'),
            valueUsd: projectedOneYearUsd,
            sublabel: strings('money.earnings.projection_disclaimer'),
          },
        ]
      : []),
  ];

  return (
    <Box testID={MoneyEarningsViewTestIds.SUMMARY}>
      {rows.map(({ label, valueUsd, sublabel }) => (
        <Box
          key={label}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-between gap-4 py-4"
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
            color={
              valueUsd > 0 ? TextColor.SuccessDefault : TextColor.TextDefault
            }
            twClassName="text-right"
          >
            {formatSignedUsd(valueUsd)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export default EarningsSummary;
