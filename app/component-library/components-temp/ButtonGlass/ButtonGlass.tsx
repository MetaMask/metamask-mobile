import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Button,
  ButtonVariant,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';

import GroupedSurface from '../elevation/GroupedSurface';

export type ButtonGlassVariant =
  | typeof ButtonVariant.Primary
  | typeof ButtonVariant.Secondary
  | typeof ButtonVariant.Tertiary;

export type ButtonGlassProps = ButtonBaseProps & {
  /** The screen's flag. False, or an OS without glass, renders the plain `Button`. */
  isGlass?: boolean;
  /** Primary and tertiary: the plain button. Secondary: brand sheen. */
  variant?: ButtonGlassVariant;
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional prop to show the danger state of the button. */
  isDanger?: boolean;
  /** Optional prop to show the inverse state of the button, reserved for buttons on colored backgrounds. */
  isInverse?: boolean;
};

/**
 * Secondary content pills use the L1 grouped treatment (stroke in dark,
 * section fill in light). Primary and tertiary stay the plain `Button`.
 * `isGlass` is ignored: content buttons are not Liquid Glass.
 */
const ButtonGlass = ({
  isGlass: _isGlass = true,
  variant = ButtonVariant.Secondary,
  containerStyle,
  twClassName,
  ...props
}: ButtonGlassProps) => {
  if (variant === ButtonVariant.Primary || variant === ButtonVariant.Tertiary) {
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
    <GroupedSurface radiusClassName="rounded-full" style={containerStyle}>
      <Button
        {...props}
        variant={variant}
        twClassName={`bg-transparent border-transparent ${
          typeof twClassName === 'string' ? twClassName : ''
        }`}
        style={props.style}
        // Fills a sized wrapper; otherwise hugs its label, as the plain Button does.
        isFullWidth={props.isFullWidth ?? containerStyle !== undefined}
      />
    </GroupedSurface>
  );
};

export default ButtonGlass;
