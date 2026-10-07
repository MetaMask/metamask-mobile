import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Button,
  ButtonVariant,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';

import GlassSurface from '../GlassSurface';

// The design-system Button is a full pill.
const PILL_RADIUS = 999;

export type ButtonGlassProps = ButtonBaseProps & {
  isGlass: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A secondary button drawn as brand refresh Liquid Glass. Kept out of the
 * design-system package on purpose: without `isGlass` it is the regular
 * secondary `Button`, so callers swap it in behind their screen flag.
 */
const ButtonGlass = ({
  isGlass,
  containerStyle,
  twClassName,
  ...props
}: ButtonGlassProps) => {
  if (!isGlass) {
    return (
      <Button
        {...props}
        variant={ButtonVariant.Secondary}
        twClassName={twClassName}
        style={props.style ?? containerStyle}
      />
    );
  }

  return (
    <GlassSurface
      borderRadius={PILL_RADIUS}
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      <Button
        {...props}
        variant={ButtonVariant.Secondary}
        twClassName="bg-transparent border-transparent"
        isFullWidth
      />
    </GlassSurface>
  );
};

export default ButtonGlass;
