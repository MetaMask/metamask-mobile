/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { Svg, Rect } from 'react-native-svg';
import MersenneTwister from 'mersenne-twister';
import Color from 'color';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Jazzicon.styles';
import { JazziconProps } from './Jazzicon.types';
import {
  DEFAULT_JAZZICON_COLORS,
  DEFAULT_JAZZICON_WOBBLE,
  DEFAULT_JAZZICON_SHAPECOUNT,
} from './Jazzicon.constants';

const Jazzicon: React.FC<JazziconProps> = ({
  style,
  size = 50,
  address,
  seed,
  colors = DEFAULT_JAZZICON_COLORS,
  wobble = DEFAULT_JAZZICON_WOBBLE,
  shapeCount = DEFAULT_JAZZICON_SHAPECOUNT,
}) => {
  const { styles } = useStyles(styleSheet, { style, size });
  if (address) {
    address = address.toLowerCase();

    if (address.startsWith('0x')) {
      seed = parseInt(address.slice(2, 10), 16);
    }
  }
  const generator = new MersenneTwister(seed);
  const amount = generator.random() * 30 - wobble / 2;
  const rotatedColors = colors.map((hex) =>
    new Color(hex).rotate(amount).hex(),
  );
  const getRandomColor = () =>
    rotatedColors.splice(
      Math.floor(rotatedColors.length * generator.random()),
      1,
    )[0];
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: getRandomColor(),
        },
      ]}
    >
      <Svg width={size} height={size}>
        {Array(shapeCount)
          .fill(0)
          .map((_, index) => {
            const center = size / 2;

            const firstRot = generator.random();
            const angle = Math.PI * 2 * firstRot;
            const velocity =
              (size / shapeCount) * generator.random() +
              (index * size) / shapeCount;

            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            const secondRot = generator.random();
            const rot = firstRot * 360 + secondRot * 180;

            return (
              <Rect
                key={`shape_${index}`}
                x={0}
                y={0}
                width={size}
                height={size}
                fill={getRandomColor()}
                transform={`translate(${tx} ${ty}) rotate(${rot.toFixed(
                  1,
                )} ${center} ${center})`}
              />
            );
          })}
      </Svg>
    </View>
  );
};

export default Jazzicon;
