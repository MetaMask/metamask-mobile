/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import CoinPattern from '../../../patterns/Coins/Coin/Coin';
import Avatar, { AvatarVariants } from '../../Avatars/Avatar';

// Internal dependencies.
import styleSheet from './Network.styles';
import { NetworkProps } from './Network.types';
import { DEFAULT_NETWORK_SIZE } from './Network.constants';

const Network = ({
  style,
  name,
  imageProps,
  size = DEFAULT_NETWORK_SIZE,
}: NetworkProps) => {
  const [showFallback, setShowFallback] = useState(!imageProps);
  const { styles } = useStyles(styleSheet, {
    style,
    size,
  });

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);
  const chainNameFirstLetter = name?.[0] ?? '?';
  const renderFallback = () => (
    <Avatar
      variant={AvatarVariants.Initial}
      initial={chainNameFirstLetter}
      size={size}
    />
  );

  return (
    <>
      {imageProps && !showFallback ? (
        <CoinPattern size={size} style={styles.base}>
          <Image
            resizeMode={'contain'}
            onError={onError}
            style={styles.image}
            {...imageProps}
          />
        </CoinPattern>
      ) : (
        renderFallback()
      )}
    </>
  );
};

export default Network;
