// Third party dependencies.
import { isNumber } from 'lodash';
import React, { useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useSelector } from 'react-redux';

// External dependencies.
import { selectIsIpfsGatewayEnabled } from '../../../../../../selectors/preferencesController';
import { isIPFSUri } from '../../../../../../util/general';
import AvatarBase from '../../foundation/AvatarBase';
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { AvatarTokenProps } from './AvatarToken.types';
import stylesheet from './AvatarToken.styles';
import {
  DEFAULT_AVATARTOKEN_SIZE,
  DEFAULT_AVATARTOKEN_ERROR_TEXT,
  AVATARTOKEN_IMAGE_TESTID,
} from './AvatarToken.constants';

const AvatarToken = ({
  size = DEFAULT_AVATARTOKEN_SIZE,
  style,
  name,
  imageSource,
  isHaloEnabled,
  isIpfsGatewayCheckBypassed = false,
  ...props
}: AvatarTokenProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const { styles } = useStyles(stylesheet, {
    style,
    size,
    isHaloEnabled,
    showFallback,
  });
  let isIpfsGatewayEnabled = false;

  if (!isIpfsGatewayCheckBypassed) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  }

  const tokenNameFirstLetter = name?.[0] ?? DEFAULT_AVATARTOKEN_ERROR_TEXT;

  const onError = () => setShowFallback(true);

  const imageUri =
    imageSource && Image.resolveAssetSource(imageSource as ImageSourcePropType);
  const isIpfsDisabledAndUriIsIpfs = imageUri
    ? !isIpfsGatewayEnabled && isIPFSUri(imageUri.uri)
    : false;

  const tokenImage = () => {
    let innerImage: React.ReactNode;
    if (showFallback || isIpfsDisabledAndUriIsIpfs) {
      innerImage = <Text style={styles.label}>{tokenNameFirstLetter}</Text>;
    } else if (
      imageSource &&
      !isNumber(imageSource) &&
      'uri' in imageSource &&
      (imageSource.uri?.endsWith('.svg') ||
        imageSource.uri?.startsWith('data:image/svg+xml'))
    ) {
      innerImage = (
        <SvgUri
          uri={imageSource.uri}
          width={size}
          height={size}
          onError={onError}
          testID={AVATARTOKEN_IMAGE_TESTID}
        />
      );
    } else {
      innerImage = (
        <Image
          source={imageSource as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          testID={AVATARTOKEN_IMAGE_TESTID}
          resizeMode={'contain'}
        />
      );
    }

    return (
      <AvatarBase size={size} style={styles.base} {...props}>
        {innerImage}
      </AvatarBase>
    );
  };

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
