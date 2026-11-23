import React from 'react';
import {
  Box,
  ContentVariant,
  FontWeight,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatSignedUsdWithThreshold } from '../../utils/moneyFormatFiat';
import { isAvailableBucket, type EarningsPoint } from './earningsHistory';
import { formatEarningsPointDate } from './EarningsChart.utils';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

interface EarningsSummaryProps {
  points: EarningsPoint[];
  locale: string;
}

type AvailableEarningsPoint = EarningsPoint & { amountUsd: number };

const EarningsSummary = ({
  points,
  locale,
}: EarningsSummaryProps): React.ReactElement => {
  const rows = points
    .filter((point): point is AvailableEarningsPoint =>
      isAvailableBucket(point),
    )
    .sort((firstPoint, secondPoint) =>
      secondPoint.start.localeCompare(firstPoint.start),
    );

  return (
    <Box testID={MoneyEarningsViewTestIds.SUMMARY}>
      {rows.map((point, index) => (
        <ListItem
          key={point.start}
          variant={ContentVariant.OneLine}
          title={formatEarningsPointDate(point, locale)}
          titleProps={{
            fontWeight: FontWeight.Medium,
            variant: TextVariant.BodyMd,
            testID: MoneyEarningsViewTestIds.SUMMARY_ROW_DATE(index),
          }}
          value={formatSignedUsdWithThreshold(point.amountUsd)}
          valueProps={{
            color:
              point.amountUsd > 0
                ? TextColor.SuccessDefault
                : TextColor.TextDefault,
            fontWeight: FontWeight.Medium,
            variant: TextVariant.BodyMd,
            testID: MoneyEarningsViewTestIds.SUMMARY_ROW_VALUE(index),
          }}
          twClassName="p-0"
          testID={MoneyEarningsViewTestIds.SUMMARY_ROW(index)}
        />
      ))}
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={MoneyEarningsViewTestIds.SUMMARY_NOTE}
      >
        {strings('money.earnings.payouts_disclaimer')}
      </Text>
    </Box>
  );
};

export default React.memo(EarningsSummary);
