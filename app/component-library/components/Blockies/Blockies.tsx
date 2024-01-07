/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import { toDataUrl } from '../../../util/blockies';

// Internal dependencies.
import styleSheet from './Blockies.styles';
import { BlockiesProps } from './Blockies.types';

const Blockies: React.FC<BlockiesProps> = ({
  style,
  accountAddress,
  size = 50,
}) => {
  const { styles } = useStyles(styleSheet, { style, size });
  return (
    <Image source={{ uri: toDataUrl(accountAddress) }} style={styles.base} />
  );
};

export default Blockies;
