import { StyleSheet, View } from 'react-native';
import { Asset } from '../../../components/UI/AssetOverview-V2/AssetOverview.types';
import Title from '../../Base/Title';
import React from 'react';

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      marginTop: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
      width: '100%',
    },
    title: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 'bold',
      marginVertical: 0,
      marginBottom: 4,
    },
  });

interface ActivityHeaderProps {
  asset: Asset;
}

const ActivityHeader = ({ asset }: ActivityHeaderProps) => {
  const styles = createStyles();
  return (
    <View style={styles.wrapper}>
      <Title style={styles.title}>{asset.name || asset.symbol} activity</Title>
    </View>
  );
};

export default ActivityHeader;
