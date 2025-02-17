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
import { HeaderBaseProps } from './HeaderBase.types';
import {
  DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

const HeaderBase: React.FC<HeaderBaseProps> = ({
  style,
  children,
  startAccessory,
  endAccessory,
  includesTopInset = false,
}) => {
  const { size: startAccessorySize, onLayout: startAccessoryOnLayout } =
    useComponentSize();
  const { size: endAccessorySize, onLayout: endAccessoryOnLayout } =
    useComponentSize();
  const insets = useSafeAreaInsets();

  const { styles } = useStyles(styleSheet, {
    style,
    startAccessorySize,
    endAccessorySize,
  });

  return (
    <View
      style={[styles.base, includesTopInset && { marginTop: insets.top }]}
      testID={HEADERBASE_TEST_ID}
    >
      <View style={styles.accessoryWrapper}>
        <View onLayout={startAccessoryOnLayout}>{startAccessory}</View>
      </View>
      <View style={styles.titleWrapper}>
        {typeof children === 'string' ? (
          <Text
            variant={DEFAULT_HEADERBASE_TITLE_TEXTVARIANT}
            style={styles.title}
            testID={HEADERBASE_TITLE_TEST_ID}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
      <View style={styles.accessoryWrapper}>
        <View onLayout={endAccessoryOnLayout}>{endAccessory}</View>
      </View>
    </View>
  );
};

export default HeaderBase;
