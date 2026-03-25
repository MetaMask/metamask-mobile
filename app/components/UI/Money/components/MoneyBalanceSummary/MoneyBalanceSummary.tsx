import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';

const HARDCODED_BALANCE = '$0.00';
interface MoneyBalanceSummaryProps {
  /**
   * APY percentage string (e.g. "4")
   */
  apy: string;
}

const MoneyBalanceSummary = ({ apy }: MoneyBalanceSummaryProps) => (
  <Box testID={MoneyBalanceSummaryTestIds.CONTAINER}>
    <Box twClassName="px-4 pb-2">
      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Bold}
        testID={MoneyBalanceSummaryTestIds.TITLE}
      >
        {strings('money.title')}
      </Text>
    </Box>

    <Box twClassName="px-4">
      <Text
        variant={TextVariant.DisplayLg}
        fontWeight={FontWeight.Medium}
        testID={MoneyBalanceSummaryTestIds.BALANCE}
        twClassName="mb-1"
      >
        {HARDCODED_BALANCE}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.SuccessDefault}
        testID={MoneyBalanceSummaryTestIds.APY}
      >
        {strings('money.apy_label', { percentage: apy })}
      </Text>
    </Box>
  </Box>
);

export default MoneyBalanceSummary;
