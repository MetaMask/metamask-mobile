/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';
import { Image as RNImage } from 'react-native';
import JazzIcon from 'react-native-jazzicon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { toDataUrl } from '../../../../../../util/blockies';
import { Maskicon } from '@metamask/design-system-react-native';

// Internal dependencies.
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';
import stylesheet from './AvatarAccount.styles';
import {
  DEFAULT_AVATARACCOUNT_TYPE,
  DEFAULT_AVATARACCOUNT_SIZE,
  BORDERRADIUS_BY_AVATARSIZE,
} from './AvatarAccount.constants';

const AvatarAccount = ({
  type: avatarType = DEFAULT_AVATARACCOUNT_TYPE,
  accountAddress,
  size = DEFAULT_AVATARACCOUNT_SIZE,
  style,
  ...props
}: AvatarAccountProps) => {
  const borderRadius = BORDERRADIUS_BY_AVATARSIZE[size];

  const avatar = useMemo(() => {
    switch (avatarType) {
      case AvatarAccountType.JazzIcon:
        return (
          <JazzIcon
            size={Number(size)}
            address={accountAddress}
            containerStyle={{ borderRadius }}
          />
        );
      case AvatarAccountType.Blockies:
        return (
          <RNImage
            source={{ uri: toDataUrl(accountAddress) }}
            style={[stylesheet.imageStyle, { borderRadius }]}
          />
        );
      case AvatarAccountType.Maskicon:
        return (
          <Maskicon
            address={accountAddress}
            size={Number(size)}
            style={{ borderRadius }}
          />
        );
      default:
        avatarType satisfies never;
        return null;
    }
  }, [avatarType, accountAddress, size, borderRadius]);

  // Apply border radius to AvatarBase container as well for proper clipping
  const avatarBaseStyle = useMemo(() => {
    const borderRadiusStyle = { borderRadius };
    return style ? [style, borderRadiusStyle] : borderRadiusStyle;
  }, [style, borderRadius]);

  return (
    <AvatarBase size={size} style={avatarBaseStyle} {...props}>
      {avatar}
    </AvatarBase>
  );
};

export default AvatarAccount;

export { AvatarAccount };
