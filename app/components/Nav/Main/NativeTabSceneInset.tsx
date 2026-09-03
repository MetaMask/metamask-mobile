import React from 'react';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

import { FloatingTabBarInsetContext } from '../../../component-library/components/Navigation/TabBarFloating';

/**
 * Bridges the native tab bar's measured height into the inset context the
 * screens already pad their content by for the floating JS bar, so nothing
 * below the navigator has to know which bar is rendering.
 *
 * Must render inside a native tab scene: the height hook throws elsewhere.
 */
const NativeTabSceneInset = ({ children }: { children: React.ReactNode }) => {
  const height = useBottomTabBarHeight();

  return (
    <FloatingTabBarInsetContext.Provider value={height}>
      {children}
    </FloatingTabBarInsetContext.Provider>
  );
};

export default NativeTabSceneInset;
