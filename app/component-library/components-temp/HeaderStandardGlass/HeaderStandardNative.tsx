import React, { useCallback, useMemo, useRef } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isEqual } from 'lodash';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  NATIVE_HEADER_BAR_HEIGHT,
  useNativeHeader,
} from '../../../components/hooks/useNativeHeader';
import {
  toNativeHeaderItems,
  type NativeHeaderConfig,
} from './headerStandardNativeItems';

export interface HeaderStandardNativeProps {
  config: NativeHeaderConfig;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Hands the header to the screen's native iOS 26 bar, so glass buttons morph
 * between screens on push and pop. In the JS header's place it leaves a spacer
 * as tall as the bar, so the screen's layout (and keyboard avoidance) is
 * unchanged under the transparent bar.
 */
const HeaderStandardNative = ({
  config,
  twClassName,
  style,
  testID,
  onLayout,
}: HeaderStandardNativeProps) => {
  const tw = useTailwind();
  const { top } = useSafeAreaInsets();
  const { handlers, ...look } = config;

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Call sites pass fresh objects every render. Keep the items stable unless
  // the look changes, so the bar isn't re-applied on each render.
  const lookRef = useRef(look);
  if (!isEqual(lookRef.current, look)) {
    lookRef.current = look;
  }
  const { title, left, right } = lookRef.current;

  const handlePress = useCallback((identifier: string) => {
    handlersRef.current[identifier]?.();
  }, []);

  const leftItems = useCallback(
    () => toNativeHeaderItems(left, handlePress),
    [left, handlePress],
  );
  const rightItems = useCallback(
    () => toNativeHeaderItems(right, handlePress),
    [right, handlePress],
  );

  const titleStyle = useMemo(() => {
    // Match the MMDS header title (BodyMd, bold).
    const { fontFamily, fontSize } = tw.style('text-body-md font-default-bold');
    return {
      fontFamily: typeof fontFamily === 'string' ? fontFamily : undefined,
      fontSize: typeof fontSize === 'number' ? fontSize : undefined,
    };
  }, [tw]);

  useNativeHeader({
    leftItems,
    rightItems,
    title,
    titleStyle,
    hidesBackButton: true,
    // Content never scrolls under the bar, so there's no edge to soften.
    hidesScrollEdgeEffect: true,
  });

  return (
    <Box
      twClassName={twClassName}
      style={[style, { height: top + NATIVE_HEADER_BAR_HEIGHT }]}
      testID={testID}
      onLayout={onLayout}
    />
  );
};

export default HeaderStandardNative;
