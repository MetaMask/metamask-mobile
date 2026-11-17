import React from 'react';
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

export type HeaderStandardGlassProps = HeaderStandardProps &
  HeaderGlassOptions & {
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
  };

/**
 * MMDS `HeaderStandard` floating over the content on a backdrop that fades in
 * with `scrollY`. Back, close and icon props render in glass capsules; custom
 * accessories pass through, so wrap them in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 */
const HeaderStandardGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  scrollY,
  onLayout,
  ...props
}: HeaderStandardGlassProps) => {
  if (!isGlass) {
    return <HeaderStandard {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderStandard
        {...props}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

HeaderStandardGlass.displayName = 'HeaderStandardGlass';

export default HeaderStandardGlass;
