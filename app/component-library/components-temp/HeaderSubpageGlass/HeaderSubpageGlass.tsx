import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderSubpage,
  type HeaderSubpageProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderSubpageGlassProps = HeaderSubpageProps &
  HeaderGlassOptions & {
    /**
     * Pinned to the surface's bottom edge below the header content, e.g. the
     * graduation fuse bar on the memecoin token details header.
     */
    bottomAccessory?: React.ReactNode;
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
  };

/**
 * MMDS `HeaderSubpage` floating over the content on a backdrop that fades in
 * with `scrollY`. Back, close and icon props render in glass capsules; custom
 * accessories pass through, so wrap them in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 */
const HeaderSubpageGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  bottomAccessory,
  scrollY,
  onLayout,
  ...props
}: HeaderSubpageGlassProps) => {
  if (!isGlass) {
    return <HeaderSubpage {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      bottomAccessory={bottomAccessory}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderSubpage
        {...props}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

export default HeaderSubpageGlass;
