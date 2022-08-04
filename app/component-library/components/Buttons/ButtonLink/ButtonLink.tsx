/* eslint-disable react/prop-types */
import React from 'react';

import Text, { TextVariant } from '../../Text';
import { useStyles } from '../../../hooks';

import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';

const ButtonLink: React.FC<ButtonLinkProps> = ({
  onPress,
  style,
  children,
  variant = TextVariant.sBodyMD,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <Text
      onPress={onPress}
      suppressHighlighting
      variant={variant}
      style={styles.base}
      {...props}
    >
      {children}
    </Text>
  );
};

export default ButtonLink;
