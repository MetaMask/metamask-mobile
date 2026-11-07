import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

export type MainActionButtonGlassProps = MainActionButtonProps & {
  /**
   * Accepted so screens can keep passing their glass flag. The sheen that
   * faked an elevated tile is removed; the control stays `bg-muted`.
   */
  isGlass?: boolean;
  /** Layout for the button, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Design-system `MainActionButton` for the quick-action tiles.
 * Previously wrapped the button in a glass sheen. That gradient is not an
 * elevation level, so the tile is the flat muted control in every state.
 */
const MainActionButtonGlass = ({
  isGlass: _isGlass = true,
  containerStyle,
  style,
  ...props
}: MainActionButtonGlassProps) => (
  <MainActionButton {...props} style={style ?? containerStyle} />
);

export default MainActionButtonGlass;
