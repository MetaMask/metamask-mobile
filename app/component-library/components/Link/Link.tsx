/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../hooks';
import styleSheet from './Link.styles';
import { LinkProps } from './Link.types';
import BaseText, { BaseTextVariant } from '../BaseText';

const Link: React.FC<LinkProps> = ({
  onPress,
  style,
  children,
  variant = BaseTextVariant.sBodyMD,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <BaseText
      onPress={onPress}
      suppressHighlighting
      variant={variant}
      style={styles.base}
      {...props}
    >
      {children}
    </BaseText>
  );
};

export default Link;
