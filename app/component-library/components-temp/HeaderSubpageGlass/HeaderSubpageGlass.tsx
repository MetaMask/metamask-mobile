import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  HeaderSubpage,
  type HeaderSubpageProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import { glassHeaderTwClassName } from '../HeaderGlass/glassHeaderTwClassName';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderSubpageGlassProps = HeaderSubpageProps &
  HeaderGlassOptions & {
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
  scrollY,
  onLayout,
  twClassName,
  ...props
}: HeaderSubpageGlassProps) => {
  const headerClassName = glassHeaderTwClassName(twClassName);

  if (!isGlass) {
    return (
      <HeaderSubpage
        {...props}
        onLayout={onLayout}
        className={headerClassName}
      />
    );
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderSubpage
        {...props}
        className={headerClassName}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

export default HeaderSubpageGlass;
