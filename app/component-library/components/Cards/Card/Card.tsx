/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Card.styles';
import { CardProps } from './Card.types';

/**
 * @deprecated Please update your code to use `Card` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Card/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
const Card: React.FC<CardProps> = ({ style, children, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <TouchableOpacity style={styles.base} {...props}>
      {children}
    </TouchableOpacity>
  );
};

export default Card;
