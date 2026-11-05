import React, { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
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

export interface MoneyNativeHeaderParams {
  onMenuPress: () => void;
  onBack?: () => void;
  isEnabled: boolean;
}

const MONEY_TITLE_SCREEN_INSET = 16;

const MoneyNativeTitle = ({
  alignToScreenEdge,
}: {
  alignToScreenEdge: boolean;
}) => {
  const titleRef = useRef<View>(null);
  const [marginLeft, setMarginLeft] = useState(0);

  const alignTitle = useCallback(
    (_event: LayoutChangeEvent) => {
      if (!alignToScreenEdge) {
        return;
      }

      titleRef.current?.measureInWindow((x) => {
        setMarginLeft((currentMargin) => {
          const nextMargin = MONEY_TITLE_SCREEN_INSET - x;
          return nextMargin === currentMargin ? currentMargin : nextMargin;
        });
      });
    },
    [alignToScreenEdge],
  );

  return (
    <Box ref={titleRef} onLayout={alignTitle} twClassName="overflow-visible">
      <Text
        variant={TextVariant.HeadingLg}
        testID={MoneyHeaderTestIds.TITLE}
        style={alignToScreenEdge ? { marginLeft } : undefined}
      >
        {strings('money.title')}
      </Text>
    </Box>
  );
};

/**
 * The Money header as a native iOS 26 bar: an inline "Money" title, with the
 * options menu on the right. Returns whether the native bar is on, so the
 * caller skips the JS `MoneyHeader`.
 */
export const useMoneyNativeHeader = ({
  onMenuPress,
  onBack,
  isEnabled,
}: MoneyNativeHeaderParams): boolean => {
  const leftItems = useCallback((): NativeStackHeaderItem[] => {
    const titleItem: NativeStackHeaderItem = {
      type: 'custom',
      hidesSharedBackground: true,
      element: (
        // UIKit's leading bar-item inset varies by device width. Measure the
        // root title and move it to the screen's 16pt content inset. A pushed
        // screen keeps the system inset so the title clears the back button.
        <MoneyNativeTitle alignToScreenEdge={!onBack} />
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
