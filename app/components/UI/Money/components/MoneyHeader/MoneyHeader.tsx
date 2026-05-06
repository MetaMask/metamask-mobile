import React from 'react';
import {
  FontWeight,
  HeaderStandard,
  IconName,
  TextVariant,
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
  <HeaderStandard
    testID={MoneyHeaderTestIds.CONTAINER}
    title={strings('money.title')}
    titleProps={{
      variant: TextVariant.HeadingLg,
      fontWeight: FontWeight.Bold,
      testID: MoneyHeaderTestIds.TITLE,
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
