import React from 'react';
import {
  HeaderBase,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
}

const MoneyHeader = ({ onMenuPress }: MoneyHeaderProps) => {
  const tw = useTailwind();

  return (
    <HeaderBase
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="px-4"
      childrenWrapperProps={{ style: tw.style('flex-1') }}
      endButtonIconProps={[
        {
          iconName: IconName.MoreVertical,
          onPress: onMenuPress,
          accessibilityLabel: 'Menu',
          testID: MoneyHeaderTestIds.MENU_BUTTON,
        },
      ]}
    >
      <Text variant={TextVariant.HeadingLg} testID={MoneyHeaderTestIds.TITLE}>
        {strings('money.title')}
      </Text>
    </HeaderBase>
  );
};

export default MoneyHeader;
