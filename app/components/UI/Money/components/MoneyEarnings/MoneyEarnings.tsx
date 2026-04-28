import React from 'react';
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
   * Handler fired when the info icon next to the section title is tapped.
   * Opens the Earnings tooltip bottom sheet.
   */
  onInfoPress?: () => void;
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
  onInfoPress,
}: MoneyEarningsProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyEarningsTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.earnings.title')}
      onInfoPress={onInfoPress}
      infoAccessibilityLabel={strings('money.earnings.info_label')}
    />

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

      <Box twClassName="gap-0.5 flex-1">
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
    </Box>
  </Box>
);

export default MoneyEarnings;
