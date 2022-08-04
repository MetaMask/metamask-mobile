/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';

import Text, { TextVariant } from '../../Text';
import { useStyles } from '../../../hooks';

import styleSheet from './Tag.styles';
import { TagProps } from './Tag.types';

const Tag = ({ label, style, ...props }: TagProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      <Text style={styles.label} variant={TextVariant.sBodyMD}>
        {label}
      </Text>
    </View>
  );
};

export default Tag;
