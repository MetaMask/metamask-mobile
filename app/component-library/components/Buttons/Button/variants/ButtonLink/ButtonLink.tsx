/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Text, { TextVariants } from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';

const ButtonLink: React.FC<ButtonLinkProps> = ({
  onPress,
  style,
  children,
  textVariants = TextVariants.sBodyMD,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <Text
      onPress={onPress}
      suppressHighlighting
      style={styles.base}
      {...props}
      variant={textVariants}
    >
      {children}
    </Text>
  );
};

export default ButtonLink;
