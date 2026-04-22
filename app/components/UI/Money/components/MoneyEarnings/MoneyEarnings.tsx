import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';

const DEFAULT_VALUE = '$0.00';

const styles = StyleSheet.create({
  projectedColumn: { flex: 1 },
});

interface MoneyEarningsProps {
  /**
   * Cumulative yield earned to date. Falls back to "$0.00" when omitted.
   */
  lifetimeEarnings?: string;
  /**
   * Forward-looking earnings based on current balance and APY. Falls back to
   * "$0.00" when omitted.
   */
  projectedEarnings?: string;
  /**
   * Render skeletons in place of the two earnings values while data is being
   * fetched.
   */
  isLoading?: boolean;
  /**
   * Handler fired when the projected column is tapped. Navigates to the "Earn
   * on your crypto" page (MUSD follow-up).
   */
  onProjectedPress?: () => void;
}

const ValueText = ({
  children,
  testID,
  color,
}: {
  children: string;
  testID: string;
  color?: TextColor;
}) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={color}
    testID={testID}
  >
    {children}
  </Text>
);

const MoneyEarnings = ({
  lifetimeEarnings = DEFAULT_VALUE,
  projectedEarnings = DEFAULT_VALUE,
  isLoading = false,
  onProjectedPress,
}: MoneyEarningsProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyEarningsTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.earnings.title')} />

    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="mt-3 gap-4"
    >
      <Box twClassName="flex-1 gap-0.5" testID={MoneyEarningsTestIds.LIFETIME}>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('money.earnings.lifetime')}
        </Text>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.LIFETIME_SKELETON}
          />
        ) : (
          <ValueText
            testID={MoneyEarningsTestIds.LIFETIME_VALUE}
            color={
              lifetimeEarnings.startsWith('+')
                ? TextColor.SuccessDefault
                : undefined
            }
          >
            {lifetimeEarnings}
          </ValueText>
        )}
      </Box>

      <Pressable
        onPress={onProjectedPress}
        style={styles.projectedColumn}
        testID={MoneyEarningsTestIds.PROJECTED}
      >
        <Box twClassName="gap-0.5">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('money.earnings.projected')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
              testID={MoneyEarningsTestIds.PROJECTED_CHEVRON}
            />
          </Box>
          {isLoading ? (
            <Skeleton
              height={24}
              width={80}
              testID={MoneyEarningsTestIds.PROJECTED_SKELETON}
            />
          ) : (
            <ValueText testID={MoneyEarningsTestIds.PROJECTED_VALUE}>
              {projectedEarnings}
            </ValueText>
          )}
        </Box>
      </Pressable>
    </Box>
  </Box>
);

export default MoneyEarnings;
