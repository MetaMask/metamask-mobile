/* eslint-disable react/prop-types */
import React from 'react';

import BaseText, { BaseTextVariant } from '../../BaseText';
import { useStyles } from '../../../hooks';

import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';

const ButtonLink: React.FC<ButtonLinkProps> = ({
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

export default ButtonLink;
