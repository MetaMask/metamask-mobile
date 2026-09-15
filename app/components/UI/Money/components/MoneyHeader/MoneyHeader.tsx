import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderRoot,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  showSecurityIndicator?: boolean;
  onSecurityPress?: () => void;
  showSetupNotification?: boolean;
}

const MoneyHeader = ({
  onMenuPress,
  showSecurityIndicator = false,
  onSecurityPress,
  showSetupNotification = false,
}: MoneyHeaderProps) => {
  const { colors } = useTheme();
  const titleStyle = { color: colors.text.default };

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      endAccessory={
        <Box twClassName="relative">
          <ButtonIcon
            iconName={IconName.MoreVertical}
            size={ButtonIconSize.Md}
            onPress={onMenuPress}
            accessibilityLabel="Menu"
            testID={MoneyHeaderTestIds.MENU_BUTTON}
          />
          {showSetupNotification && (
            <Box
              pointerEvents="none"
              twClassName="absolute right-1 top-1 size-1.5 rounded-full bg-error-default"
              testID={MoneyHeaderTestIds.MENU_NOTIFICATION_DOT}
            />
          )}
        </Box>
      }
      title={strings('money.title')}
      titleProps={{
        style: titleStyle,
        testID: MoneyHeaderTestIds.TITLE,
      }}
      titleAccessory={
        showSecurityIndicator ? (
          <Pressable
            onPress={onSecurityPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings('money.security.info_title')}
            testID={MoneyHeaderTestIds.SECURITY_BUTTON}
          >
            <Icon
              name={IconName.SecurityTick}
              size={IconSize.Md}
              color={IconColor.SuccessDefault}
            />
          </Pressable>
        ) : undefined
      }
    />
  );
};

export default MoneyHeader;
