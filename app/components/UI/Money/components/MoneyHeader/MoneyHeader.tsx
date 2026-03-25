import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Handler for the back/navigation button
   */
  onBackPress: () => void;
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
}

const MoneyHeader = ({ onBackPress, onMenuPress }: MoneyHeaderProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-1 pt-2 pb-5"
    testID={MoneyHeaderTestIds.CONTAINER}
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
);

export default MoneyHeader;
