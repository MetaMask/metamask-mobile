/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External depdendencies.
import { useStyles } from '../../../hooks/useStyles';

// Internal dependencies.
import { CoinProps } from './Coin.types';
import styleSheet from './Coin.styles';
import { COIN_TEST_ID, DEFAULT_COIN_SIZE } from './Coin.constants';

const Coin: React.FC<CoinProps> = ({
  size = DEFAULT_COIN_SIZE,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return (
    <View style={styles.base} testID={COIN_TEST_ID}>
      {children}
    </View>
  );
};

export default Coin;
