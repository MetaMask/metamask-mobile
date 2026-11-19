import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  ButtonVariant,
  IconColor,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

import ButtonGlass from './ButtonGlass';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

/** Primary tint alpha: lets the glass refraction and edge highlight show through. */
export const FLOATING_ACTION_TINT_OPACITY = 0.85;

const SECONDARY_TEXT_PROPS = { color: TextColor.TextDefault } as const;
const SECONDARY_ICON_PROPS = {
  size: IconSize.Md,
  color: IconColor.IconDefault,
} as const;

const styles = StyleSheet.create({
  // On glass the wrapper takes the row's flex; the button fills it.
  container: {
    flex: 1,
  },
  button: {
    paddingLeft: 0,
    paddingRight: 4,
  },
});

export type FloatingActionButtonGlassProps = React.ComponentProps<
  typeof Button
> & {
  /** Draw on Liquid Glass. False renders the plain `Button` unchanged. */
  isGlass: boolean;
  /** Primary only: its fill, drawn as a translucent glass tint. */
  tintColor?: string;
};

/**
 * An action floating over content, one of a row of equal-width buttons. On
 * glass the solid fill and border drop: secondary is clear glass with default
 * text, primary keeps its colour as a translucent tint. Off glass it is the
 * plain `Button`.
 */
const FloatingActionButtonGlass = ({
  isGlass,
  tintColor,
  variant,
  ...props
}: FloatingActionButtonGlassProps) => {
  if (!isGlass) {
    return <Button {...props} variant={variant} />;
  }
  const isPrimary = variant === ButtonVariant.Primary;
  return (
    <ButtonGlass
      {...props}
      {...(isPrimary
        ? {}
        : {
            textProps: SECONDARY_TEXT_PROPS,
            startIconProps: SECONDARY_ICON_PROPS,
          })}
      isGlass
      variant={isPrimary ? ButtonVariant.Primary : ButtonVariant.Secondary}
      hasSheen={false}
      tintColor={
        isPrimary && tintColor
          ? colorWithOpacity(tintColor, FLOATING_ACTION_TINT_OPACITY)
          : undefined
      }
      containerStyle={styles.container}
      style={styles.button}
      isFullWidth
    />
  );
};

export default FloatingActionButtonGlass;
