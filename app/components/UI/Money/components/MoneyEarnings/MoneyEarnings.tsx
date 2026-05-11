import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';

interface MoneyEarningsProps {
  /**
   * Estimated monthly earnings based on current balance and APY, formatted in
   * the user's selected currency.
   */
  monthlyEarnings: string;
  /**
   * Estimated yearly earnings based on current balance and APY, formatted in
   * the user's selected currency.
   */
  yearlyEarnings: string;
  /**
   * Render skeletons in place of the two earnings values while data is being
   * fetched.
   */
  isLoading?: boolean;
  /**
   * Handler fired when the info icon next to the section title is tapped.
   * Opens the Earnings tooltip bottom sheet.
   */
  onInfoPress?: () => void;
}

const ValueText = ({
  children,
  testID,
}: {
  children: string;
  testID: string;
}) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.SuccessDefault}
    testID={testID}
  >
    {`+${children}`}
  </Text>
);

const MoneyEarnings = ({
  monthlyEarnings,
  yearlyEarnings,
  isLoading = false,
  onInfoPress,
}: MoneyEarningsProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyEarningsTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.earnings.title')}
      onInfoPress={onInfoPress}
      infoAccessibilityLabel={strings('money.earnings.info_label')}
    />

    <Box twClassName="mt-3 gap-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.MONTHLY}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.earnings.estimated_monthly')}
        </Text>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.MONTHLY_SKELETON}
          />
        ) : (
          <ValueText testID={MoneyEarningsTestIds.MONTHLY_VALUE}>
            {monthlyEarnings}
          </ValueText>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.YEARLY}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.earnings.estimated_yearly')}
        </Text>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.YEARLY_SKELETON}
          />
        ) : (
          <ValueText testID={MoneyEarningsTestIds.YEARLY_VALUE}>
            {yearlyEarnings}
          </ValueText>
        )}
      </Box>
    </Box>
  </Box>
);

export default MoneyEarnings;
