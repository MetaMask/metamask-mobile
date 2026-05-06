import React from 'react';
import {
  HeaderBase,
  HeaderBaseVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
}

const MoneyHeader = ({ onMenuPress }: MoneyHeaderProps) => (
  <HeaderBase
    testID={MoneyHeaderTestIds.CONTAINER}
    variant={HeaderBaseVariant.Display}
    titleTestID={MoneyHeaderTestIds.TITLE}
    endButtonIconProps={[
      {
        iconName: IconName.MoreVertical,
        onPress: onMenuPress,
        accessibilityLabel: 'Menu',
        testID: MoneyHeaderTestIds.MENU_BUTTON,
      },
    ]}
  >
    {strings('money.title')}
  </HeaderBase>
);

export default MoneyHeader;
