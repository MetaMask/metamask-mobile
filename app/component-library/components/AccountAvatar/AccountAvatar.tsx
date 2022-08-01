/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';
import JazzIcon from 'react-native-jazzicon';
import { toDataUrl } from '../../../util/blockies';
import Avatar from '../Avatar';
import stylesheet from './AccountAvatar.styles';
import { AccountAvatarProps, AccountAvatarType } from './AccountAvatar.types';

const AccountAvatar = ({
  type,
  accountAddress,
  size,
  style,
}: AccountAvatarProps) => (
  <Avatar size={size} style={style}>
    {
      {
        [AccountAvatarType.JazzIcon]: (
          <JazzIcon size={Number(size)} address={accountAddress} />
        ),
        [AccountAvatarType.Blockies]: (
          <Image
            source={{ uri: toDataUrl(accountAddress) }}
            style={stylesheet.imageStyle}
          />
        ),
      }[type]
    }
  </Avatar>
);

export default AccountAvatar;

export { AccountAvatar };
