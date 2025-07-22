import React, { useEffect } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';

import Text from '../../../../../../component-library/components/Texts/Text';
import { TokenI } from '../../../../../UI/Tokens/types';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './asset.styles';

const Asset = () => {
  const { styles } = useStyles(styleSheet, {});
  const route =
    useRoute<RouteProp<Record<string, { asset: TokenI }>, string>>();
  const { asset: paramsAsset } = route?.params ?? {};
  const { asset, updateAsset } = useSendContext();

  useEffect(() => {
    updateAsset(paramsAsset);
  }, [paramsAsset]);

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.name ?? 'NA'}</Text>
    </View>
  );
};

export default Asset;
