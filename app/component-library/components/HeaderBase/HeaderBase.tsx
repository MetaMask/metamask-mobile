/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import { useComponentSize, useStyles } from '../../hooks';
import Text from '../Texts/Text';

// Internal dependencies.
import styleSheet from './HeaderBase.styles';
import { HeaderBaseProps, HeaderBaseVariant } from './HeaderBase.types';
import {
  HEADERBASE_VARIANT_TEXT_VARIANTS,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

const HeaderBase: React.FC<HeaderBaseProps> = ({
  style,
  children,
  startAccessory,
  endAccessory,
  includesTopInset = false,
  variant = HeaderBaseVariant.Compact,
  startAccessoryWrapperProps,
  endAccessoryWrapperProps,
}) => {
  const { size: startAccessorySize, onLayout: startAccessoryOnLayout } =
    useComponentSize();
  const { size: endAccessorySize, onLayout: endAccessoryOnLayout } =
    useComponentSize();
  const insets = useSafeAreaInsets();

  // Determine text variant based on variant prop
  const textVariant = HEADERBASE_VARIANT_TEXT_VARIANTS[variant];

  // Determine alignment based on variant
  const isLeftAligned = variant === HeaderBaseVariant.Display;

  const { styles } = useStyles(styleSheet, {
    style,
    startAccessorySize,
    endAccessorySize,
    variant,
  });
  const hasAnyAccessory = startAccessory || endAccessory;

  // Determine when to render accessory wrappers based on alignment
  const shouldRenderStartAccessoryWrapper = isLeftAligned
    ? !!startAccessory // Left aligned: only render if startAccessory exists
    : hasAnyAccessory; // Center aligned: render if any accessory exists

  const shouldRenderEndAccessoryWrapper = isLeftAligned
    ? !!endAccessory // Left aligned: only render if endAccessory exists
    : hasAnyAccessory; // Center aligned: render if any accessory exists

  return (
    <View
      style={[styles.base, includesTopInset && { marginTop: insets.top }]}
      testID={HEADERBASE_TEST_ID}
    >
      {shouldRenderStartAccessoryWrapper ? (
        <View style={styles.accessoryWrapper} {...startAccessoryWrapperProps}>
          <View onLayout={startAccessoryOnLayout}>{startAccessory}</View>
        </View>
      ) : null}
      <View style={styles.titleWrapper}>
        {typeof children === 'string' ? (
          <Text
            variant={textVariant}
            style={styles.title}
            testID={HEADERBASE_TITLE_TEST_ID}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
      {shouldRenderEndAccessoryWrapper ? (
        <View style={styles.accessoryWrapper} {...endAccessoryWrapperProps}>
          <View onLayout={endAccessoryOnLayout}>{endAccessory}</View>
        </View>
      ) : null}
    </View>
  );
};

export default HeaderBase;
