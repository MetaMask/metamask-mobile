import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import RaisedSheenSurface from '../elevation/RaisedSheenSurface';

// Clears the button's own `bg-muted` so only the plate shows.
const transparentStyle = { backgroundColor: 'transparent' };

export type MainActionButtonGlassProps = MainActionButtonProps & {
  /** Ignored. Money tiles always use the opaque raised plate. */
  isGlass?: boolean;
  /** Layout for the button or its glass wrapper, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Money action tile. The elevation prototype always draws an opaque L2 plate.
 * `isGlass` is ignored: primary actions are not Liquid Glass.
 */
const MainActionButtonGlass = ({
  isGlass: _isGlass = true,
  containerStyle,
  style: _style,
  ...props
}: MainActionButtonGlassProps) => (
  <RaisedSheenSurface radiusClassName="rounded-2xl" style={containerStyle}>
    <MainActionButton {...props} style={transparentStyle} />
  </RaisedSheenSurface>
);

export default MainActionButtonGlass;
