import React from 'react';
import {
  ButtonIcon,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';

import GlassCapsule from '../GlassCapsule';

export type ButtonIconCapsuleProps = ButtonIconProps & {
  /** Seats the icon in a header capsule: glass, blur or flat by platform. */
  isCapsule?: boolean;
  capsuleTestID?: string;
};

/**
 * A design-system `ButtonIcon` for headers, in a round `GlassCapsule` when
 * `isCapsule` is set and the plain icon otherwise.
 */
const ButtonIconCapsule = ({
  isCapsule = false,
  capsuleTestID,
  ...props
}: ButtonIconCapsuleProps) =>
  isCapsule ? (
    <GlassCapsule twClassName="w-10 justify-center" testID={capsuleTestID}>
      <ButtonIcon {...props} />
    </GlassCapsule>
  ) : (
    <ButtonIcon {...props} />
  );

export default ButtonIconCapsule;
