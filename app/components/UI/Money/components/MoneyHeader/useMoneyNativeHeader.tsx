import React, { useCallback } from 'react';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import {
  Box,
  ButtonIcon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import MoneyMfaHeaderBadge from '../MoneyMfa/MoneyMfaHeaderBadge';

export interface MoneyNativeHeaderParams {
  onMenuPress: () => void;
  onBack?: () => void;
  isEnabled: boolean;
  /** Shows the green shield next to the title when 2-step verification is on. */
  isMfaEnabled?: boolean;
  /** Opens the 2-step verification sheet from the shield. */
  onMfaBadgePress?: () => void;
}

/**
 * The Money header as a native iOS 26 bar: an inline "Money" title, with the
 * options menu on the right. Returns whether the native bar is on, so the
 * caller skips the JS `MoneyHeader`.
 */
export const useMoneyNativeHeader = ({
  onMenuPress,
  onBack,
  isEnabled,
  isMfaEnabled,
  onMfaBadgePress,
}: MoneyNativeHeaderParams): boolean => {
  const leftItems = useCallback((): NativeStackHeaderItem[] => {
    const titleItem: NativeStackHeaderItem = {
      type: 'custom',
      hidesSharedBackground: true,
      element: (
        <Box twClassName="flex-row items-center gap-1">
          <Text
            variant={TextVariant.HeadingLg}
            testID={MoneyHeaderTestIds.TITLE}
          >
            {strings('money.title')}
          </Text>
          {isMfaEnabled ? (
            <MoneyMfaHeaderBadge onPress={onMfaBadgePress} />
          ) : null}
        </Box>
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
  }, [onBack, isMfaEnabled, onMfaBadgePress]);

  const rightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        element: (
          <Box twClassName="px-1">
            <ButtonIcon
              iconName={IconName.MoreVertical}
              onPress={onMenuPress}
              accessibilityLabel="Menu"
              testID={MoneyHeaderTestIds.MENU_BUTTON}
              twClassName="bg-transparent"
            />
          </Box>
        ),
      },
    ],
    [onMenuPress],
  );

  return useNativeHeader({
    leftItems,
    rightItems,
    isEnabled,
    // The screen draws its own backdrop under the bar.
    hidesScrollEdgeEffect: true,
  });
};
