/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useComponentSize, useStyles } from '../../hooks';
import Text, { TextVariant } from '../Texts/Text';

// Internal dependencies.
import styleSheet from './Header.styles';
import { HeaderProps } from './Header.types';

const Header: React.FC<HeaderProps> = ({
  style,
  children,
  startAccessory,
  endAccessory,
}) => {
  const { size: startAccessorySize, onLayout: startAccessoryOnLayout } =
    useComponentSize();
  const { size: endAccessorySize, onLayout: endAccessoryOnLayout } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, {
    style,
    startAccessorySize,
    endAccessorySize,
  });

  return (
    <View style={styles.base}>
      <View style={styles.accessoryWrapper}>
        <View onLayout={startAccessoryOnLayout}>{startAccessory}</View>
      </View>
      <View style={styles.titleWrapper}>
        {typeof children === 'string' ? (
          <Text variant={TextVariant.HeadingSM} style={styles.title}>
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

export default Header;
