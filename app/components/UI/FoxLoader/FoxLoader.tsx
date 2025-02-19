import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './FoxLoader.styles';

const FoxLoader = () => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../images/branding/fox.png')}
        resizeMode="contain"
      />
      <View style={styles.spacer} />
      <ActivityIndicator size="large" color="orange" />
    </View>
  );
};

export default FoxLoader;
