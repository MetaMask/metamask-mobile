import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
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
   * Interest earned over the last 30 days, formatted in USD.
   */
  last30DaysEarnings: string;
  /**
   * Interest earned since the Money Account position was created, formatted
   * in USD.
   */
  sinceInceptionEarnings: string;
  /**
   * Render skeletons in place of the two earnings values while data is being
   * fetched.
   */
  isLoading?: boolean;
  /**
   * Opens the Monthly earnings info bottom sheet.
   */
  onMonthlyInfoPress?: () => void;
  /**
   * Opens the Lifetime earnings info bottom sheet.
   */
  onLifetimeInfoPress?: () => void;
  /**
   * Whether the earnings values should be masked.
   */
  privacyMode?: boolean;
}

const styles = StyleSheet.create({
  label: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});

const ValueText = ({
  children,
  testID,
  privacyMode,
}: {
  children: string;
  testID: string;
  privacyMode: boolean;
}) => {
  const isPositive = children.startsWith('+');
  return (
    <SensitiveText
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={isPositive ? TextColor.SuccessDefault : TextColor.TextDefault}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={testID}
    >
      {children}
    </SensitiveText>
  );
};

const MoneyEarnings = ({
  last30DaysEarnings,
  sinceInceptionEarnings,
  isLoading = false,
  onMonthlyInfoPress,
  onLifetimeInfoPress,
  privacyMode = false,
}: MoneyEarningsProps) => (
  <Box twClassName="px-4 pt-7 pb-3" testID={MoneyEarningsTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.earnings.title')} />

    <Box twClassName="mt-5 gap-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.LAST_30_DAYS}
      >
        <Pressable
          onPress={onMonthlyInfoPress}
          accessibilityRole="button"
          accessibilityLabel={strings('money.earnings.monthly_info_label')}
          disabled={!onMonthlyInfoPress}
          testID={MoneyEarningsTestIds.MONTHLY_LABEL}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.label}
          >
            {strings('money.earnings.estimated_monthly')}
          </Text>
        </Pressable>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.LAST_30_DAYS_SKELETON}
          />
        ) : (
          <ValueText
            testID={MoneyEarningsTestIds.LAST_30_DAYS_VALUE}
            privacyMode={privacyMode}
          >
            {last30DaysEarnings}
          </ValueText>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.SINCE_INCEPTION}
      >
        <Pressable
          onPress={onLifetimeInfoPress}
          accessibilityRole="button"
          accessibilityLabel={strings('money.earnings.lifetime_info_label')}
          disabled={!onLifetimeInfoPress}
          testID={MoneyEarningsTestIds.LIFETIME_LABEL}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.label}
          >
            {strings('money.earnings.estimated_lifetime')}
          </Text>
        </Pressable>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.SINCE_INCEPTION_SKELETON}
          />
        ) : (
          <ValueText
            testID={MoneyEarningsTestIds.SINCE_INCEPTION_VALUE}
            privacyMode={privacyMode}
          >
            {sinceInceptionEarnings}
          </ValueText>
        )}
      </Box>
    </Box>
  </Box>
);

export default MoneyEarnings;
