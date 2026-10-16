import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Button,
  ButtonVariant,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import BoxGlass from '../BoxGlass';
import { useTheme } from '../../../util/theme';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import { BLUR_INTENSITY } from '../../hooks/useBlurMaterial';

export type ButtonGlassVariant =
  | typeof ButtonVariant.Primary
  | typeof ButtonVariant.Secondary
  | typeof ButtonVariant.Tertiary;

export type ButtonGlassProps = ButtonBaseProps & {
  /** The screen's flag. False, or an OS without glass, renders the plain `Button`. */
  isGlass?: boolean;
  /** Where glass isn't drawn, puts the button on a blurred material (iOS < 26). */
  isBlur?: boolean;
  /** Keeps the button's own fill under the glass; saturated tints wash out. */
  hasSolidFill?: boolean;
  /** Primary: tinted with its fill. Secondary: brand sheen. Tertiary: clear glass. */
  variant?: ButtonGlassVariant;
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional prop to show the danger state of the button. */
  isDanger?: boolean;
  /** Optional prop to show the inverse state of the button, reserved for buttons on colored backgrounds. */
  isInverse?: boolean;
};

/**
 * The design-system `Button` drawn on Liquid Glass, kept out of the package
 * until the design system takes it. Callers pass their screen flag as `isGlass`.
 * Tertiary stays the plain button: a ghost control has no glass container.
 */
const ButtonGlass = ({
  isGlass = true,
  isBlur = false,
  hasSolidFill = false,
  variant = ButtonVariant.Secondary,
  containerStyle,
  twClassName,
  ...props
}: ButtonGlassProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { isGlassEnabled, blurTint } = useLiquidGlass();
  const isGlassDrawn = isGlass && isGlassEnabled;
  // Fills a sized wrapper; otherwise hugs its label, as the plain Button does.
  const isFullWidth = props.isFullWidth ?? containerStyle !== undefined;

  if (!isGlassDrawn && isBlur) {
    return (
      <BlurView
        tint={blurTint}
        intensity={BLUR_INTENSITY}
        style={[tw.style('overflow-hidden rounded-full'), containerStyle]}
      >
        <Button
          {...props}
          variant={variant}
          twClassName="bg-transparent border-transparent"
          isFullWidth={isFullWidth}
        />
      </BlurView>
    );
  }

  if (!isGlassDrawn) {
    return (
      <Button
        {...props}
        variant={variant}
        twClassName={twClassName}
        style={props.style ?? containerStyle}
      />
    );
  }

  const isTinted = variant === ButtonVariant.Primary && !hasSolidFill;

  return (
    <BoxGlass
      radiusClassName="rounded-full"
      isInteractive={!props.isDisabled}
      hasSheen={variant === ButtonVariant.Secondary && !hasSolidFill}
      tintColor={isTinted ? colors.icon.default : undefined}
      containerStyle={containerStyle}
    >
      <Button
        {...props}
        variant={variant}
        twClassName={
          hasSolidFill ? twClassName : 'bg-transparent border-transparent'
        }
        isFullWidth={isFullWidth}
      />
    </BoxGlass>
  );
};

export default ButtonGlass;
