import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import BoxGlass from '../BoxGlass';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

// Clears the button's own `bg-muted` so only the glass shows.
const transparentStyle = { backgroundColor: 'transparent' };

export type MainActionButtonGlassProps = MainActionButtonProps & {
  /** The screen's flag. False, or an OS without glass, renders the plain `MainActionButton`. */
  isGlass?: boolean;
  /** Layout for the button or its glass wrapper, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * The design-system `MainActionButton` on a brand refresh glass surface, kept
 * out of the package until the design system takes it.
 */
const MainActionButtonGlass = ({
  isGlass = true,
  containerStyle,
  style,
  ...props
}: MainActionButtonGlassProps) => {
  const { isGlassEnabled } = useLiquidGlass();

  if (!isGlass || !isGlassEnabled) {
    return <MainActionButton {...props} style={style ?? containerStyle} />;
  }

  return (
    <BoxGlass
      radiusClassName="rounded-2xl"
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      <MainActionButton {...props} style={transparentStyle} />
    </BoxGlass>
  );
};

export default MainActionButtonGlass;
