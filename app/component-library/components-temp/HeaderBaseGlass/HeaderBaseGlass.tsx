import React from 'react';
import {
  HeaderBase,
  type HeaderBaseProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, {
  type HeaderGlassOptions,
  type HeaderGlassProps,
} from '../HeaderGlass';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';

export type HeaderBaseGlassProps = HeaderBaseProps &
  HeaderGlassOptions &
  Pick<HeaderGlassProps, 'containerStyle'> & {
    applyStyleToContainer?: boolean;
  };

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
  containerStyle,
  applyStyleToContainer = false,
  isFloating,
  onLayout,
  ...props
}: HeaderBaseGlassProps) => {
  if (!isGlass) {
    return <HeaderBase {...props} onLayout={onLayout} />;
  }

  // Some headers need the same layout styles on both glass layers. Keep this
  // opt-in so styles such as margins are not applied twice elsewhere.
  const resolvedContainerStyle =
    containerStyle ?? (applyStyleToContainer ? props.style : undefined);

  return (
    <HeaderGlass
      onLayout={onLayout}
      containerStyle={resolvedContainerStyle}
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
