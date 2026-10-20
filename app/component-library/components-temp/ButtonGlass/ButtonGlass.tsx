import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Button,
  ButtonVariant,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';

import BoxGlass from '../BoxGlass';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

export type ButtonGlassVariant =
  | typeof ButtonVariant.Primary
  | typeof ButtonVariant.Secondary
  | typeof ButtonVariant.Tertiary;

export type ButtonGlassProps = ButtonBaseProps & {
  /** The screen's flag. False, or an OS without glass, renders the plain `Button`. */
  isGlass?: boolean;
  /** Secondary: the brand sheen. Primary and Tertiary: the plain button. */
  variant?: ButtonGlassVariant;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * The design-system `Button` on the brand refresh sheen, kept out of the
 * package until the design system takes it. Callers pass their screen flag as
 * `isGlass`. Only Secondary takes the sheen: Primary keeps its own fill, and
 * Tertiary is a ghost control.
 */
const ButtonGlass = ({
  isGlass = true,
  variant = ButtonVariant.Secondary,
  containerStyle,
  twClassName,
  ...props
}: ButtonGlassProps) => {
  const { isGlassEnabled } = useLiquidGlass();

  if (!isGlass || !isGlassEnabled || variant !== ButtonVariant.Secondary) {
    return (
      <Button
        {...props}
        variant={variant}
        twClassName={twClassName}
        style={props.style ?? containerStyle}
      />
    );
  }

  return (
    <BoxGlass
      radiusClassName="rounded-full"
      hasSheen
      containerStyle={containerStyle}
    >
      <Button
        {...props}
        variant={variant}
        twClassName="bg-transparent border-transparent"
        // Fills a sized wrapper; otherwise hugs its label, as the plain Button does.
        isFullWidth={props.isFullWidth ?? containerStyle !== undefined}
      />
    </BoxGlass>
  );
};

export default ButtonGlass;
