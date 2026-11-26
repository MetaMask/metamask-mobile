import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderStandard,
  type HeaderStandardProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import { glassHeaderTwClassName } from '../HeaderGlass/glassHeaderTwClassName';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';
import { useIsNativeHeader } from '../../../components/hooks/useNativeHeader';
import HeaderStandardNative from './HeaderStandardNative';
import { getNativeHeaderConfig } from './headerStandardNativeItems';

export type HeaderStandardGlassProps = HeaderStandardProps &
  HeaderGlassOptions & {
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
    /**
     * Opts a screen's top header into the native iOS 26 bar. The screen must
     * not set `headerShown` itself, or UIKit's bar is hidden.
     *
     * @default false
     */
    isNativeHeaderEnabled?: boolean;
    /**
     * With the native bar, lets the screen's scroll view run under it: the
     * header renders no view and reports the JS header's height (0 otherwise), so
     * the screen pads its scroll content by it. The scroll view must then be
     * the header's next sibling and the first view on screen, or UIKit can't
     * find it for the scroll edge effect. Without it, a spacer holds the
     * bar's place.
     */
    onNativeHeaderInset?: (inset: number) => void;
  };

/**
 * MMDS `HeaderStandard` floating over the content on a backdrop that fades in
 * with `scrollY`. Back, close and icon props render in glass capsules; custom
 * accessories pass through, so wrap them in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 *
 * With `isNativeHeaderEnabled` on iOS 26, a screen's top header
 * (`includesTopInset`, not floating) with mappable icons moves into the native
 * bar instead, so its buttons morph between screens. Behind `glassHeaders`.
 * Native bar buttons have no `testID`; they carry an accessibility label.
 */
const HeaderStandardGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  scrollY,
  onLayout,
  twClassName,
  isNativeHeaderEnabled = false,
  onNativeHeaderInset,
  ...props
}: HeaderStandardGlassProps) => {
  const headerClassName = glassHeaderTwClassName(twClassName);
  const isNativeSupported = useIsNativeHeader();
  const nativeConfig =
    isGlass &&
    isNativeHeaderEnabled &&
    isNativeSupported &&
    isFloating === false &&
    props.includesTopInset
      ? getNativeHeaderConfig(props)
      : undefined;

  if (!isGlass) {
    return (
      <HeaderStandard
        {...props}
        onLayout={onLayout}
        className={headerClassName}
      />
    );
  }

  const glassHeader = (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderStandard
        {...props}
        className={headerClassName}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );

  if (nativeConfig) {
    return (
      <HeaderStandardNative
        config={nativeConfig}
        fallback={glassHeader}
        twClassName={twClassName}
        style={props.style}
        testID={props.testID}
        onLayout={onLayout}
        onInset={onNativeHeaderInset}
      />
    );
  }

  return glassHeader;
};

HeaderStandardGlass.displayName = 'HeaderStandardGlass';

export default HeaderStandardGlass;
