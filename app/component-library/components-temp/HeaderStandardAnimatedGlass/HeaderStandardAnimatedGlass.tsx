import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderStandardAnimated,
  type HeaderStandardAnimatedProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import { glassHeaderTwClassName } from '../HeaderGlass/glassHeaderTwClassName';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderStandardAnimatedGlassProps = HeaderStandardAnimatedProps &
  HeaderGlassOptions & {
    /** Extra backdrop height below the header, for content pinned under it. */
    backdropExtension?: number | SharedValue<number>;
  };

/**
 * MMDS `HeaderStandardAnimated` floating over the content on a backdrop that
 * fades in with `scrollY`. Back, close and icon props render in glass
 * capsules; custom accessories pass through, so wrap them in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 */
const HeaderStandardAnimatedGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  backdropExtension,
  isFloating,
  onLayout,
  twClassName,
  ...props
}: HeaderStandardAnimatedGlassProps) => {
  const headerClassName = glassHeaderTwClassName(twClassName);

  if (!isGlass) {
    return (
      <HeaderStandardAnimated
        {...props}
        onLayout={onLayout}
        twClassName={headerClassName}
      />
    );
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={props.scrollY}
      fadeInDistance={fadeInDistance}
      backdropExtension={backdropExtension}
      isFloating={isFloating}
    >
      <HeaderStandardAnimated
        {...props}
        twClassName={headerClassName}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

export default HeaderStandardAnimatedGlass;
