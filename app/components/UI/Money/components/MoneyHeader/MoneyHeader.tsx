import React from 'react';
import { HeaderRoot, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
}

const MoneyHeader = ({ onMenuPress }: MoneyHeaderProps) => (
  <HeaderRoot
    testID={MoneyHeaderTestIds.CONTAINER}
    twClassName="px-4"
    endButtonIconProps={[
      {
        iconName: IconName.MoreVertical,
        onPress: onMenuPress,
        accessibilityLabel: 'Menu',
        testID: MoneyHeaderTestIds.MENU_BUTTON,
      },
    ]}
    title={strings('money.title')}
    titleProps={{
      testID: MoneyHeaderTestIds.TITLE,
    }}
  />
);

export default MoneyHeader;
