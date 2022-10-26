// Third party dependencies.
import React from 'react';
import { Image, ImageBackground } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import styleSheet from './AvatarImage.styles';
import { AvatarImageProps } from './AvatarImage.types';

const AvatarImage = ({
  style,
  imageSource,
  size = AvatarSize.Md,
  isHaloEnabled = false,
}: AvatarImageProps) => {
  const { styles } = useStyles(styleSheet, { style, size, isHaloEnabled });
  const renderImage = () => (
    <Image source={imageSource} style={styles.image} resizeMode={'contain'} />
  );

  return (
    <AvatarBase size={size} style={styles.base}>
      {isHaloEnabled ? (
        <ImageBackground
          blurRadius={20}
          style={styles.halo}
          imageStyle={styles.haloImage}
          source={imageSource}
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
