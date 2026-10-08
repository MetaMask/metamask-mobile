import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import GlassSurface from '../GlassSurface';

// Clears the button's own `bg-muted` so only the glass shows.
const transparentStyle = { backgroundColor: 'transparent' };

export type GlassMainActionButtonProps = MainActionButtonProps & {
  isGlass: boolean;
  /** Layout for the button or its glass wrapper, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * The design-system `MainActionButton` on a brand refresh glass surface.
 * Without `isGlass` it is the plain button, so callers can switch freely.
 */
const GlassMainActionButton = ({
  isGlass,
  containerStyle,
  style,
  ...props
}: GlassMainActionButtonProps) => {
  if (!isGlass) {
    return <MainActionButton {...props} style={style ?? containerStyle} />;
  }

  return (
    <GlassSurface
      radiusClassName="rounded-2xl"
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      <MainActionButton {...props} style={transparentStyle} />
    </GlassSurface>
  );
};

export default GlassMainActionButton;
