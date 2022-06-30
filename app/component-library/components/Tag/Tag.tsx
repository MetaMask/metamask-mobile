/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import BaseText, { BaseTextVariant } from '../BaseText';
import styleSheet from './Tag.styles';
import { TagProps } from './Tag.types';

const Tag: React.FC<TagProps> = ({ label, style, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      <BaseText style={styles.label} variant={BaseTextVariant.sBodyMD}>
        {label}
      </BaseText>
    </View>
  );
};

export default Tag;
