/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageSourcePropType, Platform } from 'react-native';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import Text, { TextVariant } from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';
import { NETWORK_AVATAR_IMAGE_ID } from './../../../../../../constants/test-ids';
import stylesheet from './AvatarNetwork.styles';
import generateTestId from '../../../../../../../wdio/utils/generateTestId';

const AvatarNetwork = ({
  size = AvatarSize.Md,
  style,
  name,
  imageSource,
}: AvatarNetworkProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);
  const { styles } = useStyles(stylesheet, { style, size, showFallback });
  const textVariant =
    size === AvatarSize.Sm || size === AvatarSize.Xs
      ? TextVariant.BodyMD
      : TextVariant.HeadingSMRegular;
  const chainNameFirstLetter = name?.[0] ?? '?';

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);

  useEffect(() => {
    setShowFallback(!imageSource);
  }, [imageSource]);

  return (
    <AvatarBase size={size} style={styles.base}>
      {showFallback ? (
        <Text style={styles.label} variant={textVariant}>
          {chainNameFirstLetter}
        </Text>
      ) : (
        <Image
          source={imageSource as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          {...generateTestId(Platform, NETWORK_AVATAR_IMAGE_ID)}
          resizeMode={'contain'}
        />
      )}
    </AvatarBase>
  );
};

export default AvatarNetwork;
