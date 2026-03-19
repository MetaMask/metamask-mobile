/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { SvgUri } from 'react-native-svg';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';
import stylesheet from './AvatarNetwork.styles';
import {
  DEFAULT_AVATARNETWORK_SIZE,
  DEFAULT_AVATARNETWORK_ERROR_TEXT,
  AVATARNETWORK_IMAGE_TESTID,
} from './AvatarNetwork.constants';

/**
 * @deprecated Please update your code to use `AvatarNetwork` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/AvatarNetwork/README.md}
 */
const AvatarNetwork = ({
  size = DEFAULT_AVATARNETWORK_SIZE,
  style,
  name,
  imageSource,
  ...props
}: AvatarNetworkProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);
  const { styles } = useStyles(stylesheet, { style, size, showFallback });
  const chainNameFirstLetter = name?.[0] ?? DEFAULT_AVATARNETWORK_ERROR_TEXT;

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);

  useEffect(() => {
    setShowFallback(!imageSource);
  }, [imageSource]);

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      {showFallback ? (
        <Text style={styles.label}>{chainNameFirstLetter}</Text>
      ) : imageSource &&
        typeof imageSource === 'object' &&
        'uri' in imageSource &&
        (imageSource.uri?.endsWith('.svg') ||
          imageSource.uri?.startsWith('data:image/svg+xml')) ? (
        <SvgUri
          uri={imageSource.uri}
          width={size}
          height={size}
          onError={onError}
          testID={AVATARNETWORK_IMAGE_TESTID}
        />
      ) : (
        <Image
          source={imageSource as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          testID={AVATARNETWORK_IMAGE_TESTID}
          resizeMode={'contain'}
        />
      )}
    </AvatarBase>
  );
};

export default AvatarNetwork;
