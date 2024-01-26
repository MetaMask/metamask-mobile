/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useEffect, useState } from 'react';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';
import { TEXTVARIANT_BY_AVATARSIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';
import stylesheet from './AvatarNetwork.styles';
import {
  DEFAULT_AVATARNETWORK_SIZE,
  DEFAULT_AVATARNETWORK_ERROR_TEXT,
  AVATARNETWORK_IMAGE_TESTID,
} from './AvatarNetwork.constants';
import NetworkIcon from '../../../../../../component-library/components/Networks/Network/Network-icon';
import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../../../../constants/network';
import { Image, ImageSourcePropType } from 'react-native';

const AvatarNetwork = ({
  size = DEFAULT_AVATARNETWORK_SIZE,
  style,
  name,
  imageSource,
  ...props
}: AvatarNetworkProps) => {
  const { chainId } = props;

  const hasSVGAvatar = Object.values(NETWORKS_CHAIN_ID_WITH_SVG).some(
    (networkId) => networkId === chainId,
  );

  const [showFallback, setShowFallback] = useState(
    !imageSource && !hasSVGAvatar,
  );
  const [svgErrorRendering, setSvgErrorRendering] = useState(false);
  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);

  const { styles } = useStyles(stylesheet, {
    style,
    size,
    showFallback,
  });
  const chainNameFirstLetter = name?.[0] ?? DEFAULT_AVATARNETWORK_ERROR_TEXT;

  const handleSvgErrorRendering = (data: boolean) => {
    setSvgErrorRendering(data);
  };

  useEffect(() => {
    setShowFallback(!imageSource && !hasSVGAvatar);
  }, [imageSource, hasSVGAvatar]);

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      {showFallback || svgErrorRendering ? (
        <Text style={styles.label} variant={TEXTVARIANT_BY_AVATARSIZE[size]}>
          {chainNameFirstLetter}
        </Text>
      ) : hasSVGAvatar ? (
        <NetworkIcon
          chainId={chainId}
          name={name}
          testID={AVATARNETWORK_IMAGE_TESTID}
          style={styles.image}
          onError={handleSvgErrorRendering}
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
