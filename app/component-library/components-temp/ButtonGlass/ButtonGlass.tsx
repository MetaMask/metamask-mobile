import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Button,
  ButtonVariant,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';

import BoxGlass from '../BoxGlass';
import { useTheme } from '../../../util/theme';

export type ButtonGlassVariant =
  | typeof ButtonVariant.Primary
  | typeof ButtonVariant.Secondary
  | typeof ButtonVariant.Tertiary;

export type ButtonGlassProps = ButtonBaseProps & {
  /** False renders the plain `Button` in the same variant. */
  isGlass?: boolean;
  /** Primary: tinted with its fill. Secondary: brand sheen. Tertiary: the plain button. */
  variant?: ButtonGlassVariant;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * The design-system `Button` drawn on Liquid Glass, kept out of the package
 * until the design system takes it. Callers gate `isGlass` on their screen flag.
 * Tertiary stays the plain button: a ghost control has no glass container.
 */
const ButtonGlass = ({
  isGlass = true,
  variant = ButtonVariant.Secondary,
  containerStyle,
  twClassName,
  ...props
}: ButtonGlassProps) => {
  const { colors } = useTheme();

  if (!isGlass || variant === ButtonVariant.Tertiary) {
    return (
      <Button
        {...props}
        variant={variant}
        twClassName={twClassName}
        style={props.style ?? containerStyle}
      />
    );
  }

  const isPrimary = variant === ButtonVariant.Primary;

  return (
    <BoxGlass
      radiusClassName="rounded-full"
      isInteractive={!props.isDisabled}
      hasSheen={variant === ButtonVariant.Secondary}
      tintColor={isPrimary ? colors.icon.default : undefined}
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
