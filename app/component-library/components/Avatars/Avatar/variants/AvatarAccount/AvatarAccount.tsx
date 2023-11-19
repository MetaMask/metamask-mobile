/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
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
  type = DEFAULT_AVATARACCOUNT_TYPE,
  accountAddress,
  size = DEFAULT_AVATARACCOUNT_SIZE,
  style,
  ...props
}: AvatarAccountProps) => (
  <AvatarBase size={size} style={style} {...props}>
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
  </AvatarBase>
);

export default AvatarAccount;

export { AvatarAccount };
