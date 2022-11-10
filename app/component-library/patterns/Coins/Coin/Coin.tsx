/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External depdendencies.
import { useStyles } from '../../../hooks/useStyles';

// Internal dependencies.
import { CoinPatternProps } from './Coin.types';
import styleSheet from './Coin.styles';
import {
  COIN_PATTERN_TEST_ID,
  DEFAULT_COIN_PATTERN_SIZE,
} from './Coin.constants';

const CoinPattern: React.FC<CoinPatternProps> = ({
  size = DEFAULT_COIN_PATTERN_SIZE,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return (
    <View style={styles.base} testID={COIN_PATTERN_TEST_ID}>
      {children}
    </View>
  );
};

export default CoinPattern;
