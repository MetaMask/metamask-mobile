import React from 'react';
import {
  HeaderStandardAnimated,
  type HeaderStandardAnimatedProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderStandardAnimatedGlassProps = HeaderStandardAnimatedProps &
  HeaderGlassOptions;

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
  isFloating,
  onLayout,
  ...props
}: HeaderStandardAnimatedGlassProps) => {
  if (!isGlass) {
    return <HeaderStandardAnimated {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={props.scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderStandardAnimated
        {...props}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

export default HeaderStandardAnimatedGlass;
