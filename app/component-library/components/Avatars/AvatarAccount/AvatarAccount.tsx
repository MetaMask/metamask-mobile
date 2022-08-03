/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';
import JazzIcon from 'react-native-jazzicon';

import Avatar, { AvatarBaseSize } from '../AvatarBase';
import { toDataUrl } from '../../../../util/blockies';

import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';
import stylesheet from './AvatarAccount.styles';

const AvatarAccount = ({
  type = AvatarAccountType.JazzIcon,
  accountAddress,
  size = AvatarBaseSize.Md,
  style,
}: AvatarAccountProps) => (
  <Avatar size={size} style={style}>
    {
      {
        [AvatarAccountType.JazzIcon]: (
          <JazzIcon size={Number(size)} address={accountAddress} />
        ),
        [AvatarAccountType.Blockies]: (
          <Image
            source={{ uri: toDataUrl(accountAddress) }}
            style={stylesheet.imageStyle}
          />
        ),
      }[type]
    }
  </Avatar>
);

export default AvatarAccount;

export { AvatarAccount };
