/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBaseBase from './foundation/AvatarBaseBase';
import AvatarBaseWithBadge from './variants/AvatarBaseWithBadge';

// Internal dependencies.
import { AvatarBaseProps } from './AvatarBase.types';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  isBadgeIncluded = false,
  badgeProps,
  ...props
}) => (
  <>
    {isBadgeIncluded && !!badgeProps ? (
      <AvatarBaseWithBadge isBadgeIncluded badgeProps={badgeProps} {...props} />
    ) : (
      <AvatarBaseBase {...props} />
    )}
  </>
);

export default AvatarBase;
