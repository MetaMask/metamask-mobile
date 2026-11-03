import React from 'react';
import {
  HeaderBase,
  type HeaderBaseProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderBaseGlassProps = HeaderBaseProps & HeaderGlassOptions;

/**
 * MMDS `HeaderBase` with optional glass treatment.
 *
 * Built-in icon props render as glass capsules while custom accessories pass
 * through unchanged. Set `isFloating={false}` for headers that remain in
 * layout flow, such as bottom-sheet headers.
 */
const HeaderBaseGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  onLayout,
  ...props
}: HeaderBaseGlassProps) => {
  if (!isGlass) {
    return <HeaderBase {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderBase
        {...props}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

HeaderBaseGlass.displayName = 'HeaderBaseGlass';

export default HeaderBaseGlass;
