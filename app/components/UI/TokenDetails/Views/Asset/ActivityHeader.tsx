import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { Asset } from '../../components/AssetOverview/AssetOverview.types';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import styleSheet from './ActivityHeader.styles';

interface ActivityHeaderProps {
  asset: Asset;
}

const ActivityHeader = ({ asset }: ActivityHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title} variant={TextVariant.HeadingMD}>
        {strings('asset_overview.activity', {
          symbol: asset.name || asset.symbol,
        })}
      </Text>
    </View>
  );
};

export default ActivityHeader;
