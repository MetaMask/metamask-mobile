import React, { useState } from 'react';
import { Image, ImageBackground } from 'react-native';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import { TokenAvatarProps } from './TokenAvatar.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './TokenAvatar.styles';
import { useStyles } from '../../../component-library/hooks';
import { TOKEN_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

const TokenAvatar = ({
  size,
  style,
  tokenName,
  tokenImageUrl,
  showHalo,
}: TokenAvatarProps) => {
  const [showFallback, setShowFallback] = useState(!tokenImageUrl);

  const { styles } = useStyles(stylesheet, {
    style,
    size,
    showHalo,
    showFallback,
  });

  const textVariant =
    size === BaseAvatarSize.Sm || size === BaseAvatarSize.Xs
      ? BaseTextVariant.lBodySM
      : BaseTextVariant.lBodyMD;
  const tokenNameFirstLetter = tokenName?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  const tokenImage = () => (
    <BaseAvatar size={size} style={styles.base}>
      {showFallback ? (
        <BaseText style={styles.label} variant={textVariant}>
          {tokenNameFirstLetter}
        </BaseText>
      ) : (
        <Image
          source={{ uri: tokenImageUrl }}
          style={styles.image}
          onError={onError}
          testID={TOKEN_AVATAR_IMAGE_ID}
        />
      )}
    </BaseAvatar>
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

export default TokenAvatar;
