/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TextComponent, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Tag.styles';
import { TagProps } from './Tag.types';

const Tag = ({ label, style, textProps, ...props }: TagProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      <TextComponent variant={TextVariant.BodyMD} {...textProps}>
        {label}
      </TextComponent>
    </View>
  );
};

export default Tag;
