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
  style,
  source,
  size = DEFAULT_AVATAR_SIZE,
  isHaloEnabled = false,
  ...props
}: AvatarImageProps) => {
  const { styles } = useStyles(styleSheet, { style, size, isHaloEnabled });
  const renderImage = () => (
    <Image
      source={source}
      style={styles.image}
      resizeMode={'contain'}
      testID={AVATAR_IMAGE_IMAGE_TEST_ID}
    />
  );

  return (
    <AvatarBase
      size={size}
      style={styles.base}
      testID={AVATAR_IMAGE_TEST_ID}
      {...props}
    >
      {isHaloEnabled ? (
        <ImageBackground
          blurRadius={20}
          style={styles.halo}
          imageStyle={styles.haloImage}
          source={source}
          testID={AVATAR_IMAGE_HALO_TEST_ID}
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
