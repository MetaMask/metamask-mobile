/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import CoinPattern from '../../../patterns/Coins/Coin/Coin';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import IconContainer from '../../Icons/IconContainer';

// Internal dependencies.
import { FaviconProps } from './Favicon.types';
import { DEFAULT_FAVICON_SIZE } from './Favicon.constants';
import styleSheet from './Favicon.styles';

const Favicon = ({
  style,
  imageProps,
  size = DEFAULT_FAVICON_SIZE,
}: FaviconProps) => {
  const [error, setError] = useState(undefined);
  const { styles } = useStyles(styleSheet, {
    style,
    size,
  });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const renderError = () => (
    <IconContainer size={size} name={IconName.GlobalFilled} />
  );

  const renderImage = () => (
    <CoinPattern size={size} style={styles.base}>
      <Image
        resizeMode={'contain'}
        onError={onError}
        style={styles.image}
        {...imageProps}
      />
    </CoinPattern>
  );

  return <>{error ? renderError() : renderImage()}</>;
};

export default Favicon;
