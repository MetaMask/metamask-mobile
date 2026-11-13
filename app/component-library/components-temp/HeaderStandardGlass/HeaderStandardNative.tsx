import { useCallback, useMemo, useRef } from 'react';
import { isEqual } from 'lodash';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useNativeHeader } from '../../../components/hooks/useNativeHeader';
import {
  toNativeHeaderItems,
  type NativeHeaderConfig,
} from './headerStandardNativeItems';

export interface HeaderStandardNativeProps {
  config: NativeHeaderConfig;
}

/**
 * Hands the header to the screen's native iOS 26 bar, so glass buttons morph
 * between screens on push and pop. Renders nothing itself.
 */
const HeaderStandardNative = ({ config }: HeaderStandardNativeProps): null => {
  const tw = useTailwind();
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
    isTransparent: false,
    hidesBackButton: true,
  });

  return null;
};

export default HeaderStandardNative;
