import React from 'react';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

interface OnboardingSquareCheckboxProps {
  /**
   * Whether the checkbox is checked. Decides the fill, the border color and
   * the check icon, and is announced through the accessibility state.
   */
  isChecked: boolean;
  /**
   * Optional test identifier for the indicator element.
   */
  testID?: string;
}

/**
 * Onboarding-only square checkbox indicator (TMCU-1919).
 *
 * The MMDS Checkbox hardcodes a fully rounded inner box (MMDS #1531) and
 * does not yet expose the inner element's styling, so onboarding renders
 * this token-based indicator with the 4px radius from the Figma Checkbox
 * node instead. It is a passive, non-interactive element: the wrapping row
 * owns the press, so the swap back to the MMDS Checkbox only needs the
 * inner-element style pass-through to ship.
 */
const OnboardingSquareCheckbox = ({
  isChecked,
  testID,
}: OnboardingSquareCheckboxProps) => (
  <Box
    accessible
    accessibilityRole="checkbox"
    accessibilityState={{ checked: isChecked }}
    pointerEvents="none"
    testID={testID}
    twClassName={`size-[22px] items-center justify-center rounded border-2 ${
      isChecked
        ? 'bg-icon-default border-icon-default'
        : 'bg-transparent border-default'
    }`}
  >
    {isChecked ? (
      <Icon
        name={IconName.Check}
        size={IconSize.Sm}
        color={IconColor.IconInverse}
      />
    ) : null}
  </Box>
);

export default OnboardingSquareCheckbox;
