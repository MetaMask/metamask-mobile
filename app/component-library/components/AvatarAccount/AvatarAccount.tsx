/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';
import JazzIcon from 'react-native-jazzicon';
import { toDataUrl } from '../../../util/blockies';
import Avatar from '../Avatar';
import stylesheet from './AvatarAccount.styles';
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';

const AvatarAccount = ({
  type = AvatarAccountType.JazzIcon,
  accountAddress,
  size,
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
