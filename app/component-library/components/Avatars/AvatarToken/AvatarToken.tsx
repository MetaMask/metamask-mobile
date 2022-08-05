// Third party dependencies.
import React, { useState } from 'react';
import { Image, ImageBackground } from 'react-native';

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
  tokenName,
  tokenImageUrl,
  showHalo,
}: AvatarTokenProps) => {
  const [showFallback, setShowFallback] = useState(!tokenImageUrl);

  const { styles } = useStyles(stylesheet, {
    style,
    size,
    showHalo,
    showFallback,
  });

  const textVariant =
    size === AvatarBaseSize.Sm || size === AvatarBaseSize.Xs
      ? TextVariant.lBodySM
      : TextVariant.lBodyMD;
  const tokenNameFirstLetter = tokenName?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  const tokenImage = () => (
    <Avatar size={size} style={styles.base}>
      {showFallback ? (
        <Text style={styles.label} variant={textVariant}>
          {tokenNameFirstLetter}
        </Text>
      ) : (
        <Image
          source={{ uri: tokenImageUrl }}
          style={styles.image}
          onError={onError}
          testID={TOKEN_AVATAR_IMAGE_ID}
        />
      )}
    </Avatar>
  );

  return !showHalo || showFallback ? (
    tokenImage()
  ) : (
    <ImageBackground
      blurRadius={20}
      style={styles.halo}
      imageStyle={styles.haloImage}
      source={{ uri: tokenImageUrl }}
    >
      {tokenImage()}
    </ImageBackground>
  );
};

export default AvatarToken;
