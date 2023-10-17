// Third party dependencies.
import React, { useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType } from 'react-native';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import Text, { TextVariant } from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { AvatarTokenProps } from './AvatarToken.types';
import stylesheet from './AvatarToken.styles';
import { TOKEN_AVATAR_IMAGE_ID } from './AvatarToken.constants';
import { useSelector } from 'react-redux';
import { selectIsIpfsGatewayEnabled } from '../../../../../../selectors/preferencesController';
import { isIPFSUri } from '../../../../../../util/general';

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
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const textVariant =
    size === AvatarSize.Sm || size === AvatarSize.Xs
      ? TextVariant.BodyMD
      : TextVariant.HeadingSMRegular;
  const tokenNameFirstLetter = name?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  const isIpfsDisabledAndUriIsIpfs = imageSource
    ? !isIpfsGatewayEnabled && isIPFSUri(imageSource)
    : false;

  const tokenImage = () => (
    <AvatarBase size={size} style={styles.base}>
      {showFallback || isIpfsDisabledAndUriIsIpfs ? (
        <Text style={styles.label} variant={textVariant}>
          {tokenNameFirstLetter}
        </Text>
      ) : (
        <Image
          source={imageSource as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          testID={TOKEN_AVATAR_IMAGE_ID}
          resizeMode={'contain'}
        />
      )}
    </AvatarBase>
  );

  return !isHaloEnabled || showFallback || isIpfsDisabledAndUriIsIpfs ? (
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
