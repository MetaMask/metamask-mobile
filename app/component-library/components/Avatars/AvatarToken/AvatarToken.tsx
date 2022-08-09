// Third party dependencies.
import React, { useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, { AvatarBaseSize } from '../AvatarBase';
import Text, { TextVariant } from '../../Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { AvatarTokenProps } from './AvatarToken.types';
import stylesheet from './AvatarToken.styles';
import { TOKEN_AVATAR_IMAGE_ID } from './AvatarToken.constants';

const AvatarToken = ({
  size,
  style,
  name,
  imageSource,
  isHaloEnabled,
}: AvatarTokenProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const { styles } = useStyles(stylesheet, {
    style,
    size,
    isHaloEnabled,
    showFallback,
  });

  const textVariant =
    size === AvatarBaseSize.Sm || size === AvatarBaseSize.Xs
      ? TextVariant.lBodySM
      : TextVariant.lBodyMD;
  const tokenNameFirstLetter = name?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  const tokenImage = () => (
    <Avatar size={size} style={styles.base}>
      {showFallback ? (
        <Text style={styles.label} variant={textVariant}>
          {tokenNameFirstLetter}
        </Text>
      ) : (
        <Image
          source={imageSource as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          testID={TOKEN_AVATAR_IMAGE_ID}
        />
      )}
    </Avatar>
  );

  return !isHaloEnabled || showFallback ? (
    tokenImage()
  ) : (
    <ImageBackground
      blurRadius={20}
      style={styles.halo}
      imageStyle={styles.haloImage}
      source={imageSource as ImageSourcePropType}
    >
      {tokenImage()}
    </ImageBackground>
  );
};

export default AvatarToken;
