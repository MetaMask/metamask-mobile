import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Formatted balance string (e.g. "$0.00")
   */
  balance: string;
  /**
   * APY percentage string (e.g. "4")
   */
  apy: string;
  /**
   * Handler for the back/navigation button
   */
  onBackPress?: () => void;
  /**
   * Handler for the overflow menu button
   */
  onMenuPress?: () => void;
}

const MoneyHeader = ({
  balance,
  apy,
  onBackPress,
  onMenuPress,
}: MoneyHeaderProps) => (
  <Box testID={MoneyHeaderTestIds.CONTAINER}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-1 py-2"
    >
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        size={ButtonIconSize.Md}
        onPress={onBackPress}
        accessibilityLabel="Back"
        testID={MoneyHeaderTestIds.BACK_BUTTON}
      />
      <ButtonIcon
        iconName={IconName.MoreVertical}
        size={ButtonIconSize.Md}
        onPress={onMenuPress}
        accessibilityLabel="Menu"
        testID={MoneyHeaderTestIds.MENU_BUTTON}
      />
    </Box>

    <Box twClassName="px-4 pb-2">
      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Bold}
        testID={MoneyHeaderTestIds.TITLE}
      >
        {strings('money.title')}
      </Text>
    </Box>

    <Box twClassName="px-4">
      <Text
        variant={TextVariant.DisplayLg}
        fontWeight={FontWeight.Medium}
        testID={MoneyHeaderTestIds.BALANCE}
      >
        {balance}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.SuccessDefault}
        testID={MoneyHeaderTestIds.APY}
      >
        {strings('money.apy_label', { percentage: apy })}
      </Text>
    </Box>
  </Box>
);

export default MoneyHeader;
