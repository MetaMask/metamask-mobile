import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import ButtonGlass, {
  type ButtonGlassProps,
  type ButtonGlassVariant,
} from '../ButtonGlass';

export type FooterGlassButtonProps = Omit<ButtonGlassProps, 'variant'>;

export interface FooterGlassProps {
  /**
   * Top button. Rendered as `ButtonVariant.Primary`.
   */
  primaryButtonProps?: FooterGlassButtonProps;
  /**
   * Middle button. Rendered as `ButtonVariant.Secondary`.
   */
  secondaryButtonProps?: FooterGlassButtonProps;
  /**
   * Bottom button. Rendered as `ButtonVariant.Tertiary`.
   */
  tertiaryButtonProps?: FooterGlassButtonProps;
  /**
   * Tailwind classes merged onto the footer container.
   */
  twClassName?: string;
  /**
   * Test ID for the footer container.
   */
  testID?: string;
}

/**
 * A vertical footer of `ButtonGlass` actions. Top to bottom: primary,
 * secondary, tertiary. Omitted buttons are skipped.
 */
const FooterGlass = ({
  primaryButtonProps,
  secondaryButtonProps,
  tertiaryButtonProps,
  twClassName,
  testID,
}: FooterGlassProps) => {
  const tw = useTailwind();

  if (!primaryButtonProps && !secondaryButtonProps && !tertiaryButtonProps) {
    return null;
  }

  const renderButton = (
    buttonProps: FooterGlassButtonProps,
    variant: ButtonGlassVariant,
  ) => (
    <ButtonGlass
      {...buttonProps}
      variant={variant}
      isFullWidth
      containerStyle={[tw.style('self-stretch'), buttonProps.containerStyle]}
      style={[tw.style('self-stretch'), buttonProps.style]}
    />
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      gap={4}
      twClassName={['px-4', twClassName].filter(Boolean).join(' ')}
      testID={testID}
    >
      {primaryButtonProps &&
        renderButton(primaryButtonProps, ButtonVariant.Primary)}
      {secondaryButtonProps &&
        renderButton(secondaryButtonProps, ButtonVariant.Secondary)}
      {tertiaryButtonProps &&
        renderButton(tertiaryButtonProps, ButtonVariant.Tertiary)}
    </Box>
  );
};

FooterGlass.displayName = 'FooterGlass';

export default FooterGlass;
