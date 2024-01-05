/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './TextInput.styles';
import { TextInputProps } from './TextInput.types';

const TextInput: React.FC<TextInputProps> = ({ style, children }) => {
  const { styles } = useStyles(styleSheet, { style });
  return <View style={styles.base}>{children}</View>;
};

export default TextInput;
