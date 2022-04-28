/* eslint-disable react/prop-types */
import { toDataUrl } from '../../../../app/util/blockies';
import React from 'react';
import { Image } from 'react-native';

import JazzIcon from 'react-native-jazzicon';

import BaseAvatar from '../../Base/BaseAvatar';
import { AccountAvatarProps, AccountAvatarType } from './AccountAvatar.types';

const AccountAvatar = ({
  type,
  accountAddress,
  size,
  style,
}: AccountAvatarProps) => (
  <BaseAvatar size={size} style={style}>
    {
      {
        [AccountAvatarType.JazzIcon]: (
          <JazzIcon size={size} address={accountAddress} />
        ),
        [AccountAvatarType.Blockies]: (
          <Image
            source={{ uri: toDataUrl(accountAddress) }}
            style={{ flex: 1 }}
          />
        ),
      }[type]
    }
  </BaseAvatar>
);

export default AccountAvatar;
