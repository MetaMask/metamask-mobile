import React, { useEffect } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';

import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './asset.styles';

const Asset = () => {
  const { styles } = useStyles(styleSheet, {});
  const route =
    useRoute<RouteProp<Record<string, { asset: AssetType }>, string>>();
  const paramsAsset = route?.params?.asset;
  const { asset, updateAsset } = useSendContext();

  useEffect(() => {
    updateAsset(paramsAsset);
  }, [paramsAsset, updateAsset]);

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.address ?? 'NA'}</Text>
    </View>
  );
};

export default Asset;
