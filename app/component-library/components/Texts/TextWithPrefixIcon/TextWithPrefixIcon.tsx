/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Icon from '../../Icon';
import Text from '../Text/Text';

// Internal dependencies.
import { TextWithPrefixIconProps } from './TextWithPrefixIcon.types';
import styleSheet from './TextWithPrefixIcon.styles';

const TextWithPrefixIcon: React.FC<TextWithPrefixIconProps> = ({
  iconProps,
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base}>
      <Icon color={styles.text.color as string} {...iconProps} />
      <Text style={styles.text} {...props}>
        {children}
      </Text>
    </View>
  );
};

export default TextWithPrefixIcon;
