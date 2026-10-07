import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import GlassSurface from '../GlassSurface';

// Matches the button's `rounded-2xl`.
const BUTTON_RADIUS = 16;
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
      borderRadius={BUTTON_RADIUS}
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      <MainActionButton {...props} style={transparentStyle} />
    </GlassSurface>
  );
};

export default GlassMainActionButton;
