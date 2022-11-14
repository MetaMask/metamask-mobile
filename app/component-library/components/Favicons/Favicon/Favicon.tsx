/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import CirclePattern from '../../../patterns/Circles/Circle/Circle';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import IconContainer from '../../Icons/IconContainer';

// Internal dependencies.
import styleSheet from './Favicon.styles';
import { FaviconProps } from './Favicon.types';
import {
  DEFAULT_FAVICON_SIZE,
  FAVICON_TEST_ID,
  FAVICON_IMAGE_TEST_ID,
} from './Favicon.constants';

const Favicon = ({
  style,
  imageProps,
  size = DEFAULT_FAVICON_SIZE,
  ...props
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
    <IconContainer size={size} iconProps={{ name: IconName.GlobalFilled }} />
  );

  const renderImage = () => (
    <CirclePattern
      size={size}
      style={styles.base}
      testID={FAVICON_TEST_ID}
      {...props}
    >
      <Image
        resizeMode={'contain'}
        onError={onError}
        style={styles.image}
        testID={FAVICON_IMAGE_TEST_ID}
        {...imageProps}
      />
    </CirclePattern>
  );

  return <>{error ? renderError() : renderImage()}</>;
};

export default Favicon;
