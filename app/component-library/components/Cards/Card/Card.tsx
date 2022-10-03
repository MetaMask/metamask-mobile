/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Card.styles';
import { CardProps } from './Card.types';

const Card: React.FC<CardProps> = ({ style, children, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      {children}
    </View>
  );
};

export default Card;
