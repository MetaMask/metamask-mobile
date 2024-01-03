/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Image, View, ImageSourcePropType } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './CryptoLogo.styles';
import { CryptoLogoProps } from './CryptoLogo.types';
import { assetByCryptoLogoName } from './CryptoLogo.assets';

const CryptoLogo: React.FC<CryptoLogoProps> = ({ style, name, size }) => {
  const { styles } = useStyles(styleSheet, { style, size });
  return (
    <View style={styles.base}>
      <Image
        source={assetByCryptoLogoName[name] as ImageSourcePropType}
        style={styles.image}
        resizeMode={'contain'}
      />
    </View>
  );
};

export default CryptoLogo;
