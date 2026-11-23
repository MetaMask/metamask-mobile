import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderRoot,
  type HeaderRootProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import { resolveEndAccessoryGlass } from '../HeaderGlass/headerGlassAccessories';

export type HeaderRootGlassProps = HeaderRootProps &
  HeaderGlassOptions & {
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
  };

/**
 * MMDS `HeaderRoot` floating over the content on a backdrop that fades in
 * with `scrollY`. Icon props render in glass capsules; a custom
 * `endAccessory` passes through, so wrap it in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 */
const HeaderRootGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  scrollY,
  onLayout,
  ...props
}: HeaderRootGlassProps) => {
  if (!isGlass) {
    return <HeaderRoot {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderRoot {...props} endAccessory={resolveEndAccessoryGlass(props)} />
    </HeaderGlass>
  );
};

export default HeaderRootGlass;
