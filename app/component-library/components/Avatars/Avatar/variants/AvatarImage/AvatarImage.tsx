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
  AVATAR_IMAGE_HALO_TEST_ID,
  AVATAR_IMAGE_IMAGE_TEST_ID,
} from './AvatarImage.constants';

const AvatarImage = ({
  size = DEFAULT_AVATAR_SIZE,
  isHaloEnabled = false,
  imageProps,
}: AvatarImageProps) => {
  const { styles } = useStyles(styleSheet, { size, isHaloEnabled });
  const renderImage = () => (
    <Image
      style={styles.image}
      resizeMode={'contain'}
      testID={AVATAR_IMAGE_IMAGE_TEST_ID}
      {...imageProps}
    />
  );

  return (
    <AvatarBase size={size} testID={AVATAR_IMAGE_TEST_ID}>
      {isHaloEnabled ? (
        <ImageBackground
          blurRadius={20}
          style={styles.halo}
          imageStyle={styles.haloImage}
          testID={AVATAR_IMAGE_HALO_TEST_ID}
          {...imageProps}
        >
          {renderImage()}
        </ImageBackground>
      ) : (
        renderImage()
      )}
    </AvatarBase>
  );
};

export default AvatarImage;
