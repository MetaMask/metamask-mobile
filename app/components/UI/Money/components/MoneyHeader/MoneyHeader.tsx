import React from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderRoot,
  IconName,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { useProSubscriptionEnabled } from '../../../../../hooks/useProSubscriptionEnabled';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /**
   * Handler for the "Get Pro" button.
   * Only fired when the Pro subscription flow flag is enabled.
   */
  onGetProPress: () => void;
}

const MoneyHeader = ({ onMenuPress, onGetProPress }: MoneyHeaderProps) => {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      endAccessory={
        <Box twClassName="flex-row items-center gap-1">
          {isProSubscriptionEnabled && (
            <Button
              size={ButtonSize.Md}
              startIconName={IconName.Gift}
              onPress={onGetProPress}
              testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
              accessibilityLabel={strings('money.get_pro')}
            >
              {strings('money.get_pro')}
            </Button>
          )}
          <ButtonIcon
            iconName={IconName.MoreVertical}
            onPress={onMenuPress}
            accessibilityLabel="Menu"
            testID={MoneyHeaderTestIds.MENU_BUTTON}
          />
        </Box>
      }
    />
  );
};

export default MoneyHeader;
