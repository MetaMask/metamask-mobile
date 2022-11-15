// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import CirclePattern from '../../../../../patterns/Circles/Circle/Circle';
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
    <CirclePattern size={size} {...props} testID={AVATAR_IMAGE_TEST_ID}>
      <Image
        style={styles.image}
        resizeMode={'contain'}
        testID={AVATAR_IMAGE_IMAGE_TEST_ID}
        {...imageProps}
      />
    </CirclePattern>
  );
};

export default AvatarImage;
