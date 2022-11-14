// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageBackground } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import CirclePattern from '../../../patterns/Circles/Circle/Circle';
import Avatar, { AvatarVariants } from '../../Avatars/Avatar';

// Internal dependencies.
import styleSheet from './Token.styles';
import { TokenProps } from './Token.types';
import { DEFAULT_TOKEN_SIZE } from './Token.constants';

const Token = ({
  style,
  name,
  imageProps,
  isHaloEnabled = true,
  size = DEFAULT_TOKEN_SIZE,
  ...props
}: TokenProps) => {
  const [showFallback, setShowFallback] = useState(!imageProps);
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isHaloEnabled,
  });

  const tokenNameFirstLetter = name?.[0] ?? '?';

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);
  const renderFallback = () => (
    <Avatar
      variant={AvatarVariants.Initial}
      initial={tokenNameFirstLetter}
      size={size}
    />
  );
  const renderImage = () => (
    <Image
      style={styles.image}
      resizeMode={'contain'}
      onError={onError}
      {...imageProps}
    />
  );
  return (
    <>
      {imageProps && !showFallback ? (
        <CirclePattern size={size} style={styles.base} {...props}>
          {isHaloEnabled ? (
            <ImageBackground
              blurRadius={20}
              style={styles.halo}
              imageStyle={styles.haloImage}
              {...imageProps}
            >
              {renderImage()}
            </ImageBackground>
          ) : (
            renderImage()
          )}
        </CirclePattern>
      ) : (
        renderFallback()
      )}
    </>
  );
};

export default Token;
