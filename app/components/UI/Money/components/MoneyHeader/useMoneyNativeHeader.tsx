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
import MoneyMfaHeaderBadge from '../MoneyMfa/MoneyMfaHeaderBadge';

export interface MoneyNativeHeaderParams {
  onMenuPress: () => void;
  onBack?: () => void;
  isEnabled: boolean;
  /** Shows the green shield next to the title when 2-step verification is on. */
  isMfaEnabled?: boolean;
  /** Opens the 2-step verification sheet from the shield. */
  onMfaBadgePress?: () => void;
  /** Pulses the shield right after 2-step verification turns on. */
  isMfaBadgeHighlighted?: boolean;
}

const MONEY_TITLE_SCREEN_INSET = 16;

const MoneyNativeTitle = ({
  alignToScreenEdge,
  children,
}: {
  alignToScreenEdge: boolean;
  children?: React.ReactNode;
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
    <Box
      ref={titleRef}
      onLayout={alignTitle}
      twClassName="flex-row items-center gap-1 overflow-visible"
    >
      <Text
        variant={TextVariant.HeadingLg}
        testID={MoneyHeaderTestIds.TITLE}
        style={alignToScreenEdge ? { marginLeft } : undefined}
      >
        {strings('money.title')}
      </Text>
      {children}
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
  isMfaEnabled,
  onMfaBadgePress,
  isMfaBadgeHighlighted,
}: MoneyNativeHeaderParams): boolean => {
  const leftItems = useCallback((): NativeStackHeaderItem[] => {
    const titleItem: NativeStackHeaderItem = {
      type: 'custom',
      hidesSharedBackground: true,
      element: (
        // UIKit's leading bar-item inset varies by device width. Measure the
        // root title and move it to the screen's 16pt content inset. A pushed
        // screen keeps the system inset so the title clears the back button.
        <MoneyNativeTitle alignToScreenEdge={!onBack}>
          {isMfaEnabled ? (
            <MoneyMfaHeaderBadge
              onPress={onMfaBadgePress}
              isHighlighted={isMfaBadgeHighlighted}
            />
          ) : null}
        </MoneyNativeTitle>
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
  }, [onBack, isMfaEnabled, onMfaBadgePress, isMfaBadgeHighlighted]);

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
