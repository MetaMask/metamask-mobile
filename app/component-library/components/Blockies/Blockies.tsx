/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';
import MersenneTwister from 'mersenne-twister';
import Color from 'color';

// External dependencies.
import { useStyles } from '../../hooks';
import { toDataUrl } from '../../../util/blockies';

// Internal dependencies.
import styleSheet from './Blockies.styles';
import { BlockiesProps } from './Blockies.types';
import { DEFAULT_BLOCKIES_COLORS } from './Blockies.constants';

const Blockies: React.FC<BlockiesProps> = ({
  style,
  accountAddress,
  size = 50,
  colors = DEFAULT_BLOCKIES_COLORS,
}) => {
  const { styles } = useStyles(styleSheet, { style, size });
  const seed = parseInt(accountAddress.toLowerCase().slice(2, 10), 16);
  const generator = new MersenneTwister(seed);
  const amount = generator.random() * 30 - 30 / 2;
  const rotatedColors = colors.map((hex) =>
    new Color(hex).rotate(amount).hex(),
  );
  const getRandomColor = () =>
    rotatedColors.splice(
      Math.floor(rotatedColors.length * generator.random()),
      1,
    )[0];

  const blockiesColors = {
    color: getRandomColor(),
    bgcolor: getRandomColor(),
    spotcolor: getRandomColor(),
  };
  return (
    <Image
      source={{ uri: toDataUrl(accountAddress, blockiesColors) }}
      style={styles.base}
    />
  );
};

export default Blockies;
