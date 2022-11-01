/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { toDataUrl } from '../../../../../../util/blockies';
import Avatar, {
  AvatarVariants as MorphAvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarJazzIcon from '../AvatarJazzIcon';
import { AvatarVariants } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';

const AvatarAccount = ({
  type = AvatarAccountType.JazzIcon,
  size = DEFAULT_AVATAR_SIZE,
  accountAddress,
  ...props
}: AvatarAccountProps) => (
  <>
    {type === AvatarAccountType.JazzIcon ? (
      <AvatarJazzIcon
        size={size}
        {...props}
        variant={AvatarVariants.JazzIcon}
      />
    ) : (
      <AvatarBase {...props}>
        <Avatar
          size={size}
          source={{ uri: toDataUrl(accountAddress) }}
          variant={MorphAvatarVariants.Image}
        />
      </AvatarBase>
    )}
  </>
);

export default AvatarAccount;

export { AvatarAccount };
