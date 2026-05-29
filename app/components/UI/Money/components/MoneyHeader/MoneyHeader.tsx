import React from 'react';
import {
  HeaderBase,
  IconName,
  Text,
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
  <HeaderBase
    testID={MoneyHeaderTestIds.CONTAINER}
    twClassName="px-4"
    startAccessoryWrapperProps={{ style: { width: 0 } }}
    childrenWrapperProps={{ style: { flex: 1, alignItems: 'flex-start' } }}
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

export default MoneyHeader;
