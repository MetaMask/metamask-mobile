/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';
import { Image } from 'react-native';
import JazzIcon from 'react-native-jazzicon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { toDataUrl } from '../../../../../../util/blockies';

// Internal dependencies.
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';
import stylesheet from './AvatarAccount.styles';
import {
  DEFAULT_AVATARACCOUNT_TYPE,
  DEFAULT_AVATARACCOUNT_SIZE,
} from './AvatarAccount.constants';

const AvatarAccount = ({
  type: avatarType = DEFAULT_AVATARACCOUNT_TYPE,
  accountAddress,
  size = DEFAULT_AVATARACCOUNT_SIZE,
  style,
  ...props
}: AvatarAccountProps) => {
  const avatar = useMemo(() => {
    switch (avatarType) {
      case AvatarAccountType.JazzIcon:
        return <JazzIcon size={Number(size)} address={accountAddress} />;
      case AvatarAccountType.Blockies:
        return (
          <Image
            source={{ uri: toDataUrl(accountAddress) }}
            style={stylesheet.imageStyle}
          />
        );
      default:
        avatarType satisfies never;
        return null;
    }
  }, [avatarType, accountAddress, size]);

  return (
    <AvatarBase size={size} style={style} {...props}>
      {avatar}
    </AvatarBase>
  );
};

export default AvatarAccount;

export { AvatarAccount };
