import React from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import HeaderGlassBackdrop from './HeaderGlassBackdrop';

/**
 * `animated` fades the backdrop in as the content scrolls under the header,
 * `static` keeps it on, and `none` leaves the header over the bare content.
 */
export type HeaderGlassBackdropMode = 'animated' | 'static' | 'none';

/** What the `Header…Glass` components add to their MMDS header's props. */
export interface HeaderGlassOptions {
  /**
   * The screen's flag. On, the header floats over the content on its backdrop,
   * with glass wherever the OS draws it; off, it is the plain MMDS header.
   *
   * @default true
   */
  isGlass?: boolean;
  /** @default 'animated' */
  backdrop?: HeaderGlassBackdropMode;
  /** Scroll distance over which the `animated` backdrop fades in. */
  fadeInDistance?: number;
  /**
   * On, the header is taken out of flow and pinned to the top of its parent
   * over its backdrop. Off, it keeps its place in flow with no backdrop, like
   * the plain MMDS header but with glass buttons, which is what a bottom sheet
   * needs so the header sits below the drag handle.
   *
   * @default true
   */
  isFloating?: boolean;
}

export interface HeaderGlassProps {
  children: React.ReactNode;
  /** Reports the header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Status bar space, when the screen doesn't already pad it. */
  topInset?: number;
  /** @default 'animated' */
  backdrop?: HeaderGlassBackdropMode;
  /** How far the content has scrolled from its resting top; drives `animated`. */
  scrollDistance?: SharedValue<number>;
  /** Scroll distance over which the `animated` backdrop fades in. */
  fadeInDistance?: number;
  /**
   * On, the header is taken out of flow and pinned to the top of its parent
   * over its backdrop. Off, it keeps its place in flow with no backdrop.
   * Bottom sheets pass false so the header sits below the drag handle.
   *
   * @default true
   */
  isFloating?: boolean;
  testID?: string;
}

export const FLOATING_HEADER_FADE_TEST_ID = 'floating-header-fade';

/** A JS header floating over the content on `HeaderGlassBackdrop`; pair with `useHeaderGlassInset`. */
const HeaderGlass = ({
  children,
  onLayout,
  topInset = 0,
  backdrop = 'animated',
  scrollDistance,
  fadeInDistance,
  isFloating = true,
  testID,
}: HeaderGlassProps) => {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="box-none"
      style={[
        isFloating && tw.style('absolute left-0 right-0 top-0 z-10'),
        { paddingTop: topInset },
      ]}
      onLayout={onLayout}
      testID={testID}
    >
      {isFloating && backdrop !== 'none' && (
        <HeaderGlassBackdrop
          scrollDistance={backdrop === 'animated' ? scrollDistance : undefined}
          fadeInDistance={fadeInDistance}
          testID={FLOATING_HEADER_FADE_TEST_ID}
        />
      )}
      {children}
    </View>
  );
};

export default HeaderGlass;
