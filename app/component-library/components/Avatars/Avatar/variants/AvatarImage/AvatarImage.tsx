// Third party dependencies.
import React from 'react';
import { Image, ImageBackground } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import AvatarBase from '../../foundation/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import styleSheet from './AvatarImage.styles';
import { AvatarImageProps } from './AvatarImage.types';
import {
  AVATAR_IMAGE_TEST_ID,
  AVATAR_IMAGE_IMAGE_TEST_ID,
} from './AvatarImage.constants';

const AvatarImage = ({
  size = DEFAULT_AVATAR_SIZE,
  imageProps,
  ...props
}: AvatarImageProps) => {
  const { styles } = useStyles(styleSheet, { size });

  return (
    <AvatarBase size={size} testID={AVATAR_IMAGE_TEST_ID} {...props}>
      <Image
        style={styles.image}
        resizeMode={'contain'}
        testID={AVATAR_IMAGE_IMAGE_TEST_ID}
        {...imageProps}
      />
    </AvatarBase>
  );
};

export default AvatarImage;
