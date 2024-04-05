import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import Title from '../../Base/Title';
import { Asset } from '../../UI/AssetOverview/AssetOverview.types';
import styleSheet from './ActivityHeader.styles';

interface ActivityHeaderProps {
  asset: Asset;
}

const ActivityHeader = ({ asset }: ActivityHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});
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
