import React, { useCallback } from 'react';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import {
  Box,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useLiquidGlass } from '../../../../../component-library/hooks/useLiquidGlass';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';
import ButtonGlass from '../../../../../component-library/components-temp/ButtonGlass';
import type { MoneyHeaderProButton } from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

export interface MoneyNativeHeaderParams {
  onMenuPress: () => void;
  proButton?: MoneyHeaderProButton;
  onBack?: () => void;
  isEnabled: boolean;
}

/**
 * The Money header as a native iOS 26 bar: an inline "Money" title, with the
 * Pro button and the options menu on the right. Returns whether the native bar
 * is on, so the caller skips the JS `MoneyHeader`.
 */
export const useMoneyNativeHeader = ({
  onMenuPress,
  proButton,
  onBack,
  isEnabled,
}: MoneyNativeHeaderParams): boolean => {
  const { isGlassEnabled } = useLiquidGlass();

  const leftItems = useCallback((): NativeStackHeaderItem[] => {
    const titleItem: NativeStackHeaderItem = {
      type: 'custom',
      hidesSharedBackground: true,
      element: (
        <Text variant={TextVariant.HeadingLg} testID={MoneyHeaderTestIds.TITLE}>
          {strings('money.title')}
        </Text>
      ),
    };
    if (!onBack) {
      return [titleItem];
    }
    return [
      {
        type: 'button',
        label: strings('navigation.back'),
        icon: { type: 'sfSymbol', name: 'chevron.backward' },
        onPress: onBack,
        sharesBackground: false,
      },
      titleItem,
    ];
  }, [onBack]);

  const rightItems = useCallback((): NativeStackHeaderItem[] => {
    const menuItem: NativeStackHeaderItem = {
      type: 'custom',
      element: (
        <Box twClassName="px-1">
          <ButtonIcon
            iconName={IconName.MoreVertical}
            onPress={onMenuPress}
            accessibilityLabel="Menu"
            testID={MoneyHeaderTestIds.MENU_BUTTON}
          />
        </Box>
      ),
    };
    if (!proButton) {
      return [menuItem];
    }
    return [
      {
        type: 'custom',
        hidesSharedBackground: true,
        element: (
          <Box twClassName="p-1">
            <ButtonGlass
              isGlass={isGlassEnabled}
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Md}
              onPress={proButton.onPress}
              accessibilityLabel={proButton.label}
              testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
            >
              {proButton.label}
            </ButtonGlass>
          </Box>
        ),
      },
      menuItem,
    ];
  }, [onMenuPress, proButton, isGlassEnabled]);

  return useNativeHeader({ leftItems, rightItems, isEnabled });
};
