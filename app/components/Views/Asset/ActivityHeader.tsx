import React from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { Asset } from '../../../components/UI/AssetOverview-V2/AssetOverview.types';
import Title from '../../Base/Title';

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
      <Title style={styles.title}>
        {strings('asset_overview.activity', {
          symbol: asset.name || asset.symbol,
        })}
      </Title>
    </View>
  );
};

export default ActivityHeader;
