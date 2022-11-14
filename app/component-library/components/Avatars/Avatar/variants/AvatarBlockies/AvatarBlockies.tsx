// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import { toDataUrl } from '../../../../../../util/blockies';
import { useStyles } from '../../../../../hooks';
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import styleSheet from './AvatarBlockies.styles';
import { AvatarBlockiesProps } from './AvatarBlockies.types';

const AvatarBlockies = ({
  size = DEFAULT_AVATAR_SIZE,
  accountAddress,
  ...props
}: AvatarBlockiesProps) => {
  const { styles } = useStyles(styleSheet, { size });
  return (
    <AvatarBase size={size} {...props}>
      <Image
        resizeMode={'contain'}
        source={{ uri: toDataUrl(accountAddress) }}
        style={styles.image}
      />
    </AvatarBase>
  );
};

export default AvatarBlockies;

export { AvatarBlockies };
