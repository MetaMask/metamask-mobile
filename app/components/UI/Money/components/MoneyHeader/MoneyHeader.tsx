import React from 'react';
import { HeaderStandard, IconName } from '@metamask/design-system-react-native';
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
  <HeaderStandard
    testID={MoneyHeaderTestIds.CONTAINER}
    onBack={onBackPress}
    backButtonProps={{
      accessibilityLabel: 'Back',
      testID: MoneyHeaderTestIds.BACK_BUTTON,
    }}
    endButtonIconProps={[
      {
        iconName: IconName.MoreVertical,
        onPress: onMenuPress,
        accessibilityLabel: 'Menu',
        testID: MoneyHeaderTestIds.MENU_BUTTON,
      },
    ]}
  />
);

export default MoneyHeader;
