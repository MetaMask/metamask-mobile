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
import {
  AVATAR_BLOCKIES_TEST_ID,
  AVATAR_BLOCKIES_IMAGE_TEST_ID,
} from './AvatarBlockies.constants';

const AvatarBlockies = ({
  size = DEFAULT_AVATAR_SIZE,
  accountAddress,
  ...props
}: AvatarBlockiesProps) => {
  const { styles } = useStyles(styleSheet, { size });
  return (
    <AvatarBase size={size} {...props} testID={AVATAR_BLOCKIES_TEST_ID}>
      <Image
        resizeMode={'contain'}
        source={{ uri: toDataUrl(accountAddress) }}
        style={styles.image}
        testID={AVATAR_BLOCKIES_IMAGE_TEST_ID}
      />
    </AvatarBase>
  );
};

export default AvatarBlockies;

export { AvatarBlockies };
