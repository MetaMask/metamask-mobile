import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderStandard,
  type HeaderStandardProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
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
  style,
  isNativeHeaderEnabled = false,
  onNativeHeaderInset,
  ...props
}: HeaderStandardGlassProps) => {
  // Force 16px horizontal padding via style prop. HeaderStandard always merges
  // 'px-2' via mergeTwClassName, so overriding via twClassName alone is not
  // reliable across all test environments. The style prop is applied last in
  // HeaderBase's style array and always wins.
  const glassPaddingStyle: StyleProp<ViewStyle> = [
    { paddingLeft: 16, paddingRight: 16 },
    style,
  ];
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
        style={glassPaddingStyle}
        twClassName={twClassName}
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
        style={glassPaddingStyle}
        twClassName={twClassName}
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
        style={style}
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
