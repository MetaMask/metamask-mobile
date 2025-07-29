/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';
import { Image as RNImage } from 'react-native';
import JazzIcon from 'react-native-jazzicon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { toDataUrl } from '../../../../../../util/blockies';
import { Maskicon } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks';

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
  const { styles } = useStyles(stylesheet, {
    style,
    size,
  });

  const avatar = useMemo(() => {
    switch (avatarType) {
      case AvatarAccountType.JazzIcon:
        return (
          <JazzIcon
            size={Number(size)}
            address={accountAddress}
            containerStyle={styles.artStyle}
          />
        );
      case AvatarAccountType.Blockies:
        return (
          <RNImage
            source={{ uri: toDataUrl(accountAddress) }}
            style={[styles.imageStyle, styles.artStyle]}
          />
        );
      case AvatarAccountType.Maskicon:
        return (
          <Maskicon
            address={accountAddress}
            size={Number(size)}
            style={styles.artStyle}
          />
        );
      default:
        avatarType satisfies never;
        return null;
    }
  }, [avatarType, accountAddress, size, styles.artStyle, styles.imageStyle]);

  return (
    <AvatarBase size={size} style={styles.avatarBase} {...props}>
      {avatar}
    </AvatarBase>
  );
};

export default AvatarAccount;

export { AvatarAccount };
