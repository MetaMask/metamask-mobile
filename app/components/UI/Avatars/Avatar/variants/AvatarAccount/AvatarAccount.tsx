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

// Internal dependencies.
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';

const AvatarAccount = ({
  type = AvatarAccountType.JazzIcon,
  accountAddress,
  ...props
}: AvatarAccountProps) => (
  <>
    {type === AvatarAccountType.JazzIcon ? (
      <AvatarJazzIcon {...props} variant={AvatarVariants.JazzIcon} />
    ) : (
      <Avatar
        source={{ uri: toDataUrl(accountAddress) }}
        {...props}
        variant={MorphAvatarVariants.Image}
      />
    )}
  </>
);

export default AvatarAccount;

export { AvatarAccount };
