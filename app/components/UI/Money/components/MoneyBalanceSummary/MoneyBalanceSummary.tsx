import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import Skeleton from '../../../../../component-library/components-temp/Skeleton/Skeleton';

const DEFAULT_BALANCE = '$0.00';

interface MoneyBalanceSummaryProps {
  /**
   * Formatted balance string (e.g. "$0.00"). Falls back to "$0.00" when omitted.
   */
  balance?: string;
  /**
   * APY percentage string (e.g. "4")
   */
  apy: string;
  /**
   * Render a loading skeleton in place of the balance value.
   */
  isLoading?: boolean;
  /**
   * Handler for the APY info icon. Opens the APY tooltip sheet.
   */
  onApyInfoPress?: () => void;
}

const MoneyBalanceSummary = ({
  balance = DEFAULT_BALANCE,
  apy,
  isLoading = false,
  onApyInfoPress,
}: MoneyBalanceSummaryProps) => (
  <Box twClassName="pt-3" testID={MoneyBalanceSummaryTestIds.CONTAINER}>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Bold}
        testID={MoneyBalanceSummaryTestIds.TITLE}
      >
        {strings('money.title')}
      </Text>
    </Box>

    <Box twClassName="px-4 pt-2">
      {isLoading ? (
        <Skeleton
          height={48}
          width={160}
          twClassName="mb-2"
          testID={MoneyBalanceSummaryTestIds.BALANCE_SKELETON}
        />
      ) : (
        <Text
          variant={TextVariant.DisplayLg}
          fontWeight={FontWeight.Bold}
          testID={MoneyBalanceSummaryTestIds.BALANCE}
          twClassName="mb-2"
        >
          {balance}
        </Text>
      )}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        <Box
          twClassName="self-start rounded-md bg-success-muted px-2 py-0.5"
          testID={MoneyBalanceSummaryTestIds.APY_TAG}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
            testID={MoneyBalanceSummaryTestIds.APY}
          >
            {strings('money.apy_label', { percentage: apy })}
          </Text>
        </Box>
        {onApyInfoPress && (
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Sm}
            onPress={onApyInfoPress}
            accessibilityLabel={strings('money.apy_info_label')}
            testID={MoneyBalanceSummaryTestIds.APY_INFO_BUTTON}
          />
        )}
      </Box>
    </Box>
  </Box>
);

export default MoneyBalanceSummary;
