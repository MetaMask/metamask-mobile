import React from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';

import CapsuleGlass from '../CapsuleGlass';

export type ButtonIconGlassProps = ButtonIconProps & {
  /** Seats the icon in a header capsule: glass, blur or flat by platform. */
  isCapsule?: boolean;
  capsuleTestID?: string;
};

// The icon's size plus a 4px ring, so every ButtonIcon size sits centred.
const CAPSULE_SIZE_CLASS: Record<ButtonIconSize, string> = {
  [ButtonIconSize.Xs]: 'h-7 w-7',
  [ButtonIconSize.Sm]: 'h-8 w-8',
  [ButtonIconSize.Md]: 'h-10 w-10',
  [ButtonIconSize.Lg]: 'h-12 w-12',
};

/**
 * A design-system `ButtonIcon` for headers, in a round `CapsuleGlass` when
 * `isCapsule` is set and the plain icon otherwise.
 */
const ButtonIconGlass = ({
  isCapsule = false,
  capsuleTestID,
  size = ButtonIconSize.Md,
  ...props
}: ButtonIconGlassProps) =>
  isCapsule ? (
    <CapsuleGlass
      twClassName={`${CAPSULE_SIZE_CLASS[size]} justify-center`}
      testID={capsuleTestID}
    >
      <ButtonIcon size={size} {...props} />
    </CapsuleGlass>
  ) : (
    <ButtonIcon size={size} {...props} />
  );

export default ButtonIconGlass;
