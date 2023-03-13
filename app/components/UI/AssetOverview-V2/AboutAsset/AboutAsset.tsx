import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import { Asset } from '../AssetOverview.types';

const createStyles = () => {
  const grey = '#535A61';
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    text: {
      fontSize: 14,
      color: grey,
      marginVertical: 0,
      lineHeight: 22,
    },
    title: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 'bold',
      marginVertical: 0,
      marginBottom: 4,
    },
  });
};

interface AboutAssetProps {
  asset: Asset;
}
const AboutAsset = ({ asset }: AboutAssetProps) => {
  const styles = createStyles();
  return (
    <View style={styles.wrapper}>
      <Title style={styles.title}>About</Title>
      <Text style={styles.text}>
        {asset.symbol} Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Praesent cursus sit amet dolor vitae luctus. Mauris sed mauris at purus
        pulvinar eleifend eu non elit.
      </Text>
    </View>
  );
};

export default AboutAsset;
