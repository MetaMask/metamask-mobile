/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import CirclePattern from '../../../patterns/Circles/Circle/Circle';
import Avatar, { AvatarVariants } from '../../Avatars/Avatar';

// Internal dependencies.
import styleSheet from './Network.styles';
import { NetworkProps } from './Network.types';
import {
  DEFAULT_NETWORK_SIZE,
  NETWORK_TEST_ID,
  NETWORK_IMAGE_TEST_ID,
} from './Network.constants';

const Network = ({
  style,
  name,
  imageProps,
  size = DEFAULT_NETWORK_SIZE,
  ...props
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
        <CirclePattern
          size={size}
          style={styles.base}
          testID={NETWORK_TEST_ID}
          {...props}
        >
          <Image
            resizeMode={'contain'}
            onError={onError}
            style={styles.image}
            testID={NETWORK_IMAGE_TEST_ID}
            {...imageProps}
          />
        </CirclePattern>
      ) : (
        renderFallback()
      )}
    </>
  );
};

export default Network;
